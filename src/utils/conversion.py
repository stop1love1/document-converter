import os
import tempfile
import base64
import subprocess
from src.config.config import UPLOAD_FOLDER
from PIL import Image
from flask import jsonify
from bs4 import BeautifulSoup

def process_file_conversion(filepath, from_format, to_format, options):
    """Process file conversion using pandoc"""
    try:
        output_filename = f"{os.path.splitext(os.path.basename(filepath))[0]}.{to_format}"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)

        is_docx_to_html = from_format.lower() == 'docx' and to_format.lower() in ['html', 'html4', 'html5']

        if is_docx_to_html:
            # Extract media so we can process WMF/EMF and enable MathJax so OMML -> LaTeX
            media_dir = os.path.join(UPLOAD_FOLDER, f"{os.path.splitext(os.path.basename(filepath))[0]}_media")
            os.makedirs(media_dir, exist_ok=True)

            cmd = ['pandoc', filepath, '-f', 'docx', '-t', 'html', f'--extract-media={media_dir}', '--mathjax']
            if options:
                cmd.extend(options.split())
            cmd.extend(['-o', output_path])

            subprocess.run(cmd, check=True)

            content = ""
            try:
                with open(output_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                content = "[Binary content - download to view]"

            # Post-process HTML: convert all images to PNG and embed as base64 data URIs
            if content and '<img' in content:
                soup = BeautifulSoup(content, 'html.parser')

                def _to_png_data_uri(image_path):
                    try:
                        mime = 'image/png'
                        with open(image_path, 'rb') as img_f:
                            encoded = base64.b64encode(img_f.read()).decode('utf-8')
                        return f"data:{mime};base64,{encoded}"
                    except Exception:
                        return None

                def _convert_wmf_emf_to_png(image_path):
                    try:
                        target_path = os.path.splitext(image_path)[0] + '.png'
                        # Prefer ImageMagick for vector formats, keep transparent background for formulas
                        subprocess.run(['convert', '-density', '300', image_path, '-background', 'none', '-alpha', 'on', target_path], check=True)
                        return target_path if os.path.exists(target_path) and os.path.getsize(target_path) > 0 else None
                    except Exception:
                        return None

                def _convert_any_to_png(image_path):
                    try:
                        if not os.path.exists(image_path):
                            return None
                        if os.path.splitext(image_path)[1].lower() == '.png':
                            return image_path
                        target_path = os.path.splitext(image_path)[0] + '.png'
                        subprocess.run(['convert', image_path, target_path], check=True)
                        return target_path if os.path.exists(target_path) and os.path.getsize(target_path) > 0 else None
                    except Exception:
                        return None

                for img in soup.find_all('img'):
                    src = img.get('src')
                    if not src or src.startswith('http://') or src.startswith('https://') or src.startswith('data:'):
                        continue

                    # Resolve filesystem path for extracted media
                    abs_path = os.path.join(UPLOAD_FOLDER, src) if not os.path.isabs(src) else src
                    if not os.path.exists(abs_path):
                        # Try resolve relative to media_dir
                        candidate = os.path.join(media_dir, os.path.basename(src))
                        abs_path = candidate if os.path.exists(candidate) else abs_path

                    ext = os.path.splitext(abs_path)[1].lower()
                    converted = None
                    if ext in ['.wmf', '.emf']:
                        converted = _convert_wmf_emf_to_png(abs_path)
                    else:
                        converted = _convert_any_to_png(abs_path)

                    if converted and os.path.exists(converted):
                        data_uri = _to_png_data_uri(converted)
                        if data_uri:
                            img['src'] = data_uri
                        else:
                            rel = os.path.relpath(converted, UPLOAD_FOLDER)
                            rel = rel.replace('\\', '/').lstrip('\\/')
                            img['src'] = rel

                new_content = str(soup)
                # Ensure MathJax (LaTeX) renders crisply with transparent background using SVG renderer
                try:
                    soup_head = soup.head
                    if soup_head is None and soup.html is not None:
                        soup_head = soup.new_tag('head')
                        soup.html.insert(0, soup_head)
                    if soup_head is not None:
                        # Remove any existing MathJax includes to avoid duplicates or CHTML renderer
                        for script in soup_head.find_all('script'):
                            src_attr = script.get('src', '')
                            if 'mathjax' in src_attr.lower():
                                script.decompose()
                        # Inject MathJax v3 SVG configuration
                        cfg = soup.new_tag('script')
                        cfg.string = (
                            "window.MathJax = {\n"
                            "  tex: { inlineMath: [['$','$'], ['\\\\(','\\\\)']], displayMath: [['$$','$$'], ['\\\\[','\\\\]']] },\n"
                            "  svg: { scale: 1.15, minScale: 1, fontCache: 'global' },\n"
                            "  options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'] }\n"
                            "};"
                        )
                        soup_head.append(cfg)
                        # Add SVG renderer
                        mj = soup.new_tag('script', src='https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js')
                        soup_head.append(mj)
                        # Tweak CSS for transparency and crisper rendering
                        style_tag = soup.new_tag('style')
                        style_tag.string = (
                            'mjx-container { background: transparent !important; font-size: 110%; }\n'
                            'mjx-container, math { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }\n'
                            'mjx-container[jax="SVG"] { direction: ltr; }'
                        )
                        soup_head.append(style_tag)
                        new_content = str(soup)
                except Exception:
                    pass
                try:
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    content = new_content
                except Exception:
                    # If we fail to write updated HTML, still return the original
                    pass

            return {
                'success': True,
                'downloadUrl': f'/download/{output_filename}',
                'content': content
            }

        # Generic conversion path
        cmd = ['pandoc', filepath, '-f', from_format, '-t', to_format]
        if options:
            cmd.extend(options.split())
        cmd.extend(['-o', output_path])

        subprocess.run(cmd, check=True)

        content = ""
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            content = "[Binary content - download to view]"

        return {
            'success': True,
            'downloadUrl': f'/download/{output_filename}',
            'content': content
        }
    except subprocess.CalledProcessError as e:
        return {'error': f'Conversion failed: {str(e)}'}

def process_image_conversion(filepath, to_format, quality=100, resize=None, options=None):
    """Process image conversion using ImageMagick
    
    Args:
        filepath (str): Path to the input image
        to_format (str): Target image format (jpg, png, gif, webp, etc.)
        quality (int, optional): Image quality (1-100). Defaults to 100.
        resize (str, optional): Resize parameter (e.g., '800x600'). Defaults to None.
        options (str, optional): Additional ImageMagick options. Defaults to None.
    
    Returns:
        dict: Result of the conversion
    """
    try:
        output_filename = f"{os.path.splitext(os.path.basename(filepath))[0]}.{to_format}"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        
        is_wmf = filepath.lower().endswith(('.wmf', '.emf'))
        
        if is_wmf:
            if to_format.lower() in ['png', 'svg']:
                try:
                    temp_svg = os.path.join(UPLOAD_FOLDER, f"{os.path.splitext(os.path.basename(filepath))[0]}_temp.svg")
                    
                    wmf2svg_cmd = ['wmf2svg', filepath, '-o', temp_svg]
                    print(f"Trying wmf2svg: {' '.join(wmf2svg_cmd)}")
                    
                    try:
                        subprocess.run(wmf2svg_cmd, check=True, stderr=subprocess.PIPE, text=True)
                    except (subprocess.CalledProcessError, FileNotFoundError):
                        print("wmf2svg not found or failed, trying direct ImageMagick conversion to SVG first")
                        img_to_svg_cmd = ['convert', filepath, temp_svg]
                        subprocess.run(img_to_svg_cmd, check=True)
                    
                    if os.path.exists(temp_svg) and os.path.getsize(temp_svg) > 0:
                        if to_format.lower() == 'png':
                            rsvg_cmd = ['rsvg-convert', '-f', 'png']
                            if resize:
                                try:
                                    width, height = resize.lower().split('x')
                                    if width:
                                        rsvg_cmd.extend(['-w', width])
                                    if height:
                                        rsvg_cmd.extend(['-h', height])
                                except ValueError:
                                    pass
                            
                            rsvg_cmd.extend(['-o', output_path, temp_svg])
                            print(f"Converting SVG to PNG with rsvg-convert: {' '.join(rsvg_cmd)}")
                            subprocess.run(rsvg_cmd, check=True)
                        elif to_format.lower() == 'svg':
                            import shutil
                            shutil.copy(temp_svg, output_path)
                        
                        if os.path.exists(temp_svg):
                            os.remove(temp_svg)
                        
                        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                            # Get base64 encoded image
                            with open(output_path, "rb") as image_file:
                                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                            
                            return {
                                'success': True,
                                'downloadUrl': f'/download/{output_filename}',
                                'base64': encoded_string,
                                'message': f'Image successfully converted to {to_format} (using SVG)'
                            }
                except Exception as svg_e:
                    print(f"SVG conversion approach failed: {str(svg_e)}")
            
            try:
                cmd = ['convert']
                cmd.extend(['-density', '300'])
                cmd.append(filepath)
                cmd.extend(['-background', 'white'])
                cmd.append('-flatten')
                cmd.extend(['-alpha', 'remove'])
                
                if resize:
                    cmd.extend(['-resize', resize])
                
                if to_format.lower() in ['jpg', 'jpeg', 'png', 'webp']:
                    cmd.extend(['-quality', str(quality)])
                    
                if options:
                    cmd.extend(options.split())
                    
                cmd.append(output_path)
                
                print(f"Trying WMF conversion with ImageMagick: {' '.join(cmd)}")
                subprocess.run(cmd, check=True, stderr=subprocess.PIPE, text=True)
                
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    # Get base64 encoded image
                    with open(output_path, "rb") as image_file:
                        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                    
                    return {
                        'success': True,
                        'downloadUrl': f'/download/{output_filename}',
                        'base64': encoded_string,
                        'message': f'Image successfully converted to {to_format}'
                    }
            except Exception as e:
                print(f"ImageMagick WMF conversion failed: {str(e)}")
            
            try:
                alt_cmd = ['convert', filepath, output_path]
                print(f"Trying simple conversion: {' '.join(alt_cmd)}")
                subprocess.run(alt_cmd, check=True)
                
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    # Get base64 encoded image
                    with open(output_path, "rb") as image_file:
                        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                    
                    return {
                        'success': True,
                        'downloadUrl': f'/download/{output_filename}',
                        'base64': encoded_string,
                        'message': f'Image successfully converted to {to_format} (simple method)'
                    }
            except Exception as alt_e:
                print(f"Simple conversion also failed: {str(alt_e)}")
            
            return {'error': f'Failed to convert WMF/EMF to {to_format}. No approach succeeded.'}
        else:
            cmd = ['convert', filepath]
            
            if to_format.lower() in ['jpg', 'jpeg', 'png', 'webp']:
                cmd.extend(['-quality', str(quality)])
            
            if resize:
                cmd.extend(['-resize', resize])
                
            if options:
                cmd.extend(options.split())
                
            cmd.append(output_path)
        
            print(f"Executing command: {' '.join(cmd)}")
            result = subprocess.run(cmd, check=True, stderr=subprocess.PIPE, text=True)
            
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                print(f"Error: Output file not created or empty. Command output: {result.stderr}")
                alt_cmd = ['convert', filepath, output_path]
                print(f"Trying alternative command: {' '.join(alt_cmd)}")
                subprocess.run(alt_cmd, check=True)
                
                if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                    return {'error': f'Failed to convert {filepath} to {to_format}. Output file was not created.'}
        
        # Get base64 encoded image
        with open(output_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
        return {
            'success': True,
            'downloadUrl': f'/download/{output_filename}',
            'base64': encoded_string,
            'message': f'Image successfully converted to {to_format}'
        }
    except subprocess.CalledProcessError as e:
        error_message = e.stderr if hasattr(e, 'stderr') else str(e)
        print(f"Conversion error: {error_message}")
        
        if filepath.lower().endswith(('.wmf', '.emf')):
            try:
                alt_cmd = ['convert', '-density', '300', filepath, output_path]
                print(f"Trying simple conversion: {' '.join(alt_cmd)}")
                subprocess.run(alt_cmd, check=True)
                
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    # Get base64 encoded image
                    with open(output_path, "rb") as image_file:
                        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                    
                    return {
                        'success': True,
                        'downloadUrl': f'/download/{output_filename}',
                        'base64': encoded_string,
                        'message': f'Image successfully converted to {to_format} (alternative method)'
                    }
            except Exception as alt_e:
                print(f"Alternative conversion also failed: {str(alt_e)}")
        
        return {'error': f'Image conversion failed: {error_message}'}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {'error': f'Image conversion failed: {str(e)}'}

def process_text_conversion(text, from_format, to_format, options):
    """Process text conversion using pandoc"""
    try:
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=f'.{from_format}') as temp_in:
            temp_in.write(text)
            temp_in_path = temp_in.name
        
        temp_out_path = temp_in_path + f'.{to_format}'
        
        cmd = ['pandoc', temp_in_path, '-f', from_format, '-t', to_format]
        if options:
            cmd.extend(options.split())
        cmd.extend(['-o', temp_out_path])
        
        subprocess.run(cmd, check=True)
        
        content = ""
        try:
            with open(temp_out_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(temp_out_path, 'rb') as f:
                content = "[Binary content]"
        
        os.unlink(temp_in_path)
        os.unlink(temp_out_path)
        
        return {
            'success': True,
            'result': content,
            'content': content
        }
    except subprocess.CalledProcessError as e:
        return {'error': f'Conversion failed: {str(e)}'}

def process_base64_conversion(base64_data, from_format, to_format, options):
    """Process base64 conversion using pandoc"""
    try:
        try:
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]
            
            decoded_content = base64.b64decode(base64_data)
        except:
            return {'error': 'Invalid base64 content'}
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{from_format}') as temp_in:
            temp_in.write(decoded_content)
            temp_in_path = temp_in.name
        
        temp_out_path = temp_in_path + f'.{to_format}'
        
        cmd = ['pandoc', temp_in_path, '-f', from_format, '-t', to_format]
        if options:
            cmd.extend(options.split())
        cmd.extend(['-o', temp_out_path])
        
        subprocess.run(cmd, check=True)
        
        converted_content = None
        content = ""
        
        try:
            with open(temp_out_path, 'r', encoding='utf-8') as f:
                content = f.read()
                converted_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
        except UnicodeDecodeError:
            with open(temp_out_path, 'rb') as f:
                binary_content = f.read()
                converted_content = base64.b64encode(binary_content).decode('utf-8')
                content = "[Binary content - encoded as base64]"
        
        os.unlink(temp_in_path)
        os.unlink(temp_out_path)
        
        return {
            'success': True,
            'result': converted_content,
            'content': content
        }
    except subprocess.CalledProcessError as e:
        return {'error': f'Conversion failed: {str(e)}'}

def process_file_with_pandoc(input_file, output_format, options=None):
    """
    Process file conversion using pandoc or other tools.
    
    This is a utility function used internally and not exposed through the API.
    """
    try:
        # Create a temporary file for the output
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{output_format}') as temp_output:
            output_path = temp_output.name

        # Use pandoc for text-based conversions
        if output_format in ['txt', 'md', 'html', 'pdf', 'docx', 'rtf']:
            cmd = ['pandoc', input_file, '-o', output_path]
            if options:
                cmd.extend(options.split())
            subprocess.run(cmd, check=True)
        else:
            raise ValueError(f"Unsupported output format: {output_format}")

        # Read the output file
        with open(output_path, 'rb') as f:
            output_data = f.read()

        # Clean up the temporary file
        os.unlink(output_path)

        return output_data
    except Exception as e:
        raise Exception(f"Error converting file: {str(e)}")

def convert_document(request, config):
    """
    Handle document conversion from web requests
    
    Args:
        request: Flask request object
        config: Flask app config
        
    Returns:
        JSON response with conversion results
    """
    try:
        if 'file' not in request.files and 'text' not in request.form and 'base64' not in request.form:
            return jsonify({'error': 'No file or text data provided'}), 400
            
        from_format = request.form.get('from_format', '')
        to_format = request.form.get('to_format', '')
        options = request.form.get('options', '')
        
        if not from_format or not to_format:
            return jsonify({'error': 'Source and target formats are required'}), 400
            
        # Handle file upload
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
                
            filename = file.filename
            filepath = os.path.join(config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Check if it's an image conversion
            if from_format in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'wmf', 'emf']:
                quality = int(request.form.get('quality', 90))
                resize = request.form.get('resize', None)
                result = process_image_conversion(filepath, to_format, quality, resize, options)
            else:
                result = process_file_conversion(filepath, from_format, to_format, options)
                
            return jsonify(result)
            
        # Handle text input
        elif 'text' in request.form:
            text = request.form['text']
            result = process_text_conversion(text, from_format, to_format, options)
            return jsonify(result)
            
        # Handle base64 input (for images)
        elif 'base64' in request.form:
            base64_data = request.form['base64']
            result = process_base64_conversion(base64_data, from_format, to_format, options)
            return jsonify(result)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500 