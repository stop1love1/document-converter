import os
import tempfile
import base64
import subprocess
from src.config.config import UPLOAD_FOLDER

def process_file_conversion(filepath, from_format, to_format, options):
    """Process file conversion using pandoc"""
    try:
        # Convert file
        output_filename = f"{os.path.splitext(os.path.basename(filepath))[0]}.{to_format}"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        
        cmd = ['pandoc', filepath, '-f', from_format, '-t', to_format]
        if options:
            cmd.extend(options.split())
        cmd.extend(['-o', output_path])
        
        subprocess.run(cmd, check=True)
        
        # Read the content of the converted file to include in the response
        content = ""
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # If file is binary, provide a message
            content = "[Binary content - download to view]"
        
        return {
            'success': True,
            'downloadUrl': f'/download/{output_filename}',
            'content': content
        }
    except subprocess.CalledProcessError as e:
        return {'error': f'Conversion failed: {str(e)}'}

def process_text_conversion(text, from_format, to_format, options):
    """Process text conversion using pandoc"""
    try:
        # Create temporary file for input
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=f'.{from_format}') as temp_in:
            temp_in.write(text)
            temp_in_path = temp_in.name
        
        # Create temporary file for output
        temp_out_path = temp_in_path + f'.{to_format}'
        
        # Convert content
        cmd = ['pandoc', temp_in_path, '-f', from_format, '-t', to_format]
        if options:
            cmd.extend(options.split())
        cmd.extend(['-o', temp_out_path])
        
        subprocess.run(cmd, check=True)
        
        # Read converted content
        content = ""
        try:
            with open(temp_out_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(temp_out_path, 'rb') as f:
                content = "[Binary content]"
        
        # Clean up temporary files
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
        # Decode base64 content
        try:
            # Remove data URL prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]
            
            decoded_content = base64.b64decode(base64_data)
        except:
            return {'error': 'Invalid base64 content'}
        
        # Create temporary file for input
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{from_format}') as temp_in:
            temp_in.write(decoded_content)
            temp_in_path = temp_in.name
        
        # Create temporary file for output
        temp_out_path = temp_in_path + f'.{to_format}'
        
        # Convert content
        cmd = ['pandoc', temp_in_path, '-f', from_format, '-t', to_format]
        if options:
            cmd.extend(options.split())
        cmd.extend(['-o', temp_out_path])
        
        subprocess.run(cmd, check=True)
        
        # Read converted content
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
        
        # Clean up temporary files
        os.unlink(temp_in_path)
        os.unlink(temp_out_path)
        
        return {
            'success': True,
            'result': converted_content,
            'content': content
        }
    except subprocess.CalledProcessError as e:
        return {'error': f'Conversion failed: {str(e)}'} 