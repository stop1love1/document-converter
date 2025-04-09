import os
import sys
import json
import shutil
import tempfile
import pandas as pd
import subprocess
from pathlib import Path
from datetime import datetime

# Determine OMRChecker path
omr_checker_path = '/app/OMRChecker'
if not os.path.exists(omr_checker_path):
    # Fallback for local development
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    omr_checker_path = os.path.join(base_dir, 'OMRChecker')
    if not os.path.exists(omr_checker_path):
        print(f"Warning: OMRChecker not found at {omr_checker_path}")

print(f"Using OMRChecker at: {omr_checker_path}")

# Define a custom template for Vietnamese OMR sheets
VIETNAMESE_TEMPLATE = {
    "bubbleDimensions": {
        "width": 20,
        "height": 20,
        "hoffset": 30,
        "woffset": 30
    },
    "preProcessors": {
        "clahe": {
            "clipLimit": 2,
            "tileGridSize": [8, 8]
        },
        "bilateral": {
            "d": 9,
            "sigmaColor": 75,
            "sigmaSpace": 75
        },
        "threshold": {
            "type": "otsu"
        }
    },
    "pageDimensions": {
        "width": 800,
        "height": 1100
    },
    "fieldBlocks": {
        "studentIDBlock": {
            "origin": [50, 100],
            "fieldDimensions": {
                "width": 400,
                "height": 280
            },
            "directions": {
                "top": "7. Số báo danh",
                "left": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
            },
            "lengths": {
                "Roll No.": 6
            },
            "fieldLabels": {
                "Roll No.": []
            }
        },
        "testCodeBlock": {
            "origin": [480, 100],
            "fieldDimensions": {
                "width": 200,
                "height": 280
            },
            "directions": {
                "top": "8. Mã đề thi",
                "left": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
            },
            "lengths": {
                "Test Code": 3
            },
            "fieldLabels": {
                "Test Code": []
            }
        }
    }
}

class OMRProcessor:
    """
    Class to handle OMR sheet processing using the OMRChecker library
    """
    
    def __init__(self, upload_folder, result_folder):
        """
        Initialize the OMR processor with folders for uploads and results
        
        Args:
            upload_folder (str): Path to the folder where uploaded images are stored
            result_folder (str): Path to the folder where results should be saved
        """
        # Make sure paths are absolute
        self.upload_folder = os.path.abspath(upload_folder)
        self.result_folder = os.path.abspath(result_folder)
        
        # Create directories if they don't exist
        os.makedirs(self.upload_folder, exist_ok=True)
        os.makedirs(self.result_folder, exist_ok=True)
        
        # Template path for OMR configuration
        self.default_template_path = os.path.join(omr_checker_path, 'samples', 'sample1', 'template.json')
        if not os.path.exists(self.default_template_path):
            print(f"Warning: Default template not found at {self.default_template_path}")
            # Try to find any template file
            for root, _, files in os.walk(omr_checker_path):
                for file in files:
                    if file == 'template.json':
                        self.default_template_path = os.path.join(root, file)
                        print(f"Using alternative template: {self.default_template_path}")
                        break
        
        # Create Vietnamese template file
        self.vietnamese_template_path = os.path.join(self.result_folder, 'vietnamese_template.json')
        with open(self.vietnamese_template_path, 'w') as f:
            json.dump(VIETNAMESE_TEMPLATE, f, indent=2)
        print(f"Created Vietnamese OMR template at {self.vietnamese_template_path}")
    
    def _prepare_input_directory(self, image_path, template_path=None):
        """
        Prepare a temporary directory with the image and template for OMRChecker
        
        Args:
            image_path (str): Path to the uploaded image
            template_path (str): Path to the custom template json (optional)
            
        Returns:
            tuple: (temp_dir, input_dir, output_dir) paths
        """
        # Create a temporary directory
        temp_dir = tempfile.mkdtemp()
        input_dir = os.path.join(temp_dir, 'input')
        output_dir = os.path.join(temp_dir, 'output')
        
        os.makedirs(input_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)
        
        # Copy the image to the input directory
        img_name = os.path.basename(image_path)
        img_dest = os.path.join(input_dir, img_name)
        
        print(f"Copying image from {image_path} to {img_dest}")
        try:
            shutil.copy(image_path, img_dest)
        except Exception as e:
            print(f"Error copying image: {str(e)}")
            raise
        
        # Copy the template file to the input directory
        template_dest = os.path.join(input_dir, 'template.json')
        
        # Use Vietnamese template by default for Vietnamese OMR sheets
        if template_path is None:
            print(f"Using Vietnamese template by default")
            template_path = self.vietnamese_template_path
            
        if template_path and os.path.exists(template_path):
            print(f"Using custom template: {template_path}")
            try:
                shutil.copy(template_path, template_dest)
            except Exception as e:
                print(f"Error copying custom template: {str(e)}")
                if os.path.exists(self.default_template_path):
                    print(f"Falling back to default template: {self.default_template_path}")
                    shutil.copy(self.default_template_path, template_dest)
        else:
            if os.path.exists(self.default_template_path):
                print(f"Using default template: {self.default_template_path}")
                try:
                    shutil.copy(self.default_template_path, template_dest)
                except Exception as e:
                    print(f"Error copying default template: {str(e)}")
                    raise
            else:
                raise FileNotFoundError("No valid template found")
            
        return temp_dir, input_dir, output_dir
    
    def process_image(self, image_path, template_path=None):
        """
        Process an OMR sheet image using OMRChecker
        
        Args:
            image_path (str): Path to the image to process
            template_path (str): Path to the custom template json (optional)
            
        Returns:
            dict: JSON results containing the detected answers
        """
        if not os.path.exists(image_path):
            print(f"Error: Image file not found at {image_path}")
            return {'error': 'Image file not found'}
        
        print(f"Processing OMR image: {image_path}")
        
        # Check if this is likely a Vietnamese OMR sheet
        if template_path is None:
            # If no template specified, use Vietnamese template by default
            template_path = self.vietnamese_template_path
            print(f"Using Vietnamese template for processing")
        
        # Prepare directories for OMRChecker
        try:
            temp_dir, input_dir, output_dir = self._prepare_input_directory(image_path, template_path)
        except Exception as e:
            print(f"Error preparing input directory: {str(e)}")
            return {'error': f'Error preparing input: {str(e)}'}
        
        try:
            # Save input image for debugging
            debug_image = os.path.join(self.result_folder, f"debug_{os.path.basename(image_path)}")
            try:
                shutil.copy(image_path, debug_image)
                print(f"Saved debug image to {debug_image}")
            except Exception as e:
                print(f"Failed to save debug image: {str(e)}")
            
            # Use direct Python execution instead of shell script to avoid dependency on file command
            cmd = [
                "python", "-u", 
                os.path.join(omr_checker_path, "main.py"),
                "--inputDir", input_dir,
                "--outputDir", output_dir,
                "--noCropping",
                "--debug"  # Add debug flag if available
            ]
            
            print(f"Running command: {' '.join(cmd)}")
            
            # Set up environment variables
            env = os.environ.copy()
            env.update({
                "DISPLAY": ":99",
                "MPLBACKEND": "Agg",
                "QT_QPA_PLATFORM": "offscreen",
                "PYTHONPATH": f"{omr_checker_path}:{env.get('PYTHONPATH', '')}"
            })
            
            # Run the process with a timeout to prevent hanging
            try:
                process = subprocess.run(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    universal_newlines=True,
                    check=False,
                    timeout=300,  # 5-minute timeout
                    env=env,
                    cwd=omr_checker_path  # Run from OMRChecker directory
                )
            except subprocess.TimeoutExpired:
                print("OMRChecker process timed out after 5 minutes")
                return {'error': 'OMRChecker process timed out after 5 minutes'}
            
            # Log full output for debugging
            print(f"STDOUT: {process.stdout}")
            print(f"STDERR: {process.stderr}")
            
            # Check if the process succeeded
            print(f"Process exit code: {process.returncode}")
            if process.returncode != 0:
                error_msg = process.stderr.strip() if process.stderr.strip() else process.stdout
                print(f"Error output: {error_msg}")
                
                # Save error log for debugging
                error_log_path = os.path.join(self.result_folder, f"error_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
                try:
                    with open(error_log_path, 'w') as f:
                        f.write(f"STDOUT:\n{process.stdout}\n\nSTDERR:\n{process.stderr}")
                    print(f"Saved error log to {error_log_path}")
                except Exception as e:
                    print(f"Failed to save error log: {str(e)}")
                    
                # Try to extract more detailed error from output
                error_details = self._extract_error_details(process.stdout, process.stderr)
                
                return {
                    'error': f'OMRChecker process failed: {error_details}',
                    'stdout': process.stdout[:1000],  # Limit output size
                    'stderr': process.stderr[:1000]
                }
            
            # Parse results
            return self._parse_results(output_dir, image_path)
            
        except Exception as e:
            print(f"Error processing OMR sheet: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'error': f'Error processing OMR sheet: {str(e)}'}
        finally:
            # Don't clean up immediately for debugging purposes
            # We'll let the OS clean up the temp directories
            print(f"Debug: Temporary directory at {temp_dir}")
    
    def _extract_error_details(self, stdout, stderr):
        """Extract more meaningful error messages from OMRChecker output"""
        # Look for common errors in stderr
        if "ImportError" in stderr:
            return "Missing dependency in OMRChecker"
        
        if "KeyError" in stderr:
            return "Template configuration error"
            
        if "ValueError" in stderr:
            return "Invalid value in OMRChecker processing"
            
        if "FileNotFoundError" in stderr:
            return "File not found during OMRChecker processing"
            
        # Look for specific errors in stdout
        if "No template.json file exists" in stdout:
            return "Template file missing"
            
        if "Exit code: 11" in stdout or "returned non-zero exit status 11" in stdout:
            return "OMRChecker failed with code 11 - likely a configuration issue with the template"
            
        # Default error
        return "Unknown error during OMR processing"
    
    def _parse_results(self, output_dir, image_path):
        """
        Parse the CSV results from OMRChecker into a JSON format
        
        Args:
            output_dir (str): Path to the OMRChecker output directory
            image_path (str): Original image path
            
        Returns:
            dict: JSON containing the detected answers and metadata
        """
        results = {
            'timestamp': datetime.now().isoformat(),
            'image': os.path.basename(image_path),
            'answers': {},
            'score': None,
            'success': False
        }
        
        # Check if output directory exists
        if not os.path.exists(output_dir):
            results['error'] = f'Output directory not found: {output_dir}'
            return results
            
        # List all files in the output directory
        try:
            output_files = os.listdir(output_dir)
            print(f"All files in output directory: {output_files}")
            
            # Look for any output files - even just images
            if output_files:
                results['output_files'] = output_files
                
                # If we have at least some outputs, consider it partial success
                results['partial_success'] = True
        except Exception as e:
            print(f"Error listing output directory: {str(e)}")
        
        # Look for CSV results
        csv_files = list(Path(output_dir).glob('*.csv'))
        if not csv_files:
            # Check if result JSON exists
            json_files = list(Path(output_dir).glob('*.json'))
            if json_files:
                try:
                    with open(json_files[0], 'r') as f:
                        json_data = json.load(f)
                    results['raw_results'] = json_data
                    results['success'] = True
                    return results
                except Exception as e:
                    print(f"Error parsing JSON results: {str(e)}")
            
            # Check for any other recognizable output
            image_files = list(Path(output_dir).glob('*.jpg')) + list(Path(output_dir).glob('*.png'))
            if image_files:
                print(f"Found processed image files: {[str(f) for f in image_files]}")
                results['output_images'] = [str(f) for f in image_files]
                
                # Try manual interpretation if we have images but no results
                try:
                    results.update(self._manual_interpretation(image_path, image_files))
                    if 'roll_number' in results or 'test_code' in results:
                        results['success'] = True
                except Exception as e:
                    print(f"Error in manual interpretation: {str(e)}")
            
            if not results.get('success'):
                print(f"No result files found in {output_dir}")
                results['error'] = 'No results found after processing'
            
            return results
            
        # Read the CSV file
        try:
            csv_path = str(csv_files[0])
            print(f"Found CSV file: {csv_path}")
            
            # Print first few lines of the CSV for debugging
            with open(csv_path, 'r') as f:
                csv_content = f.read(1000)
                print(f"CSV content preview: {csv_content}")
            
            df = pd.read_csv(csv_path)
            
            # Get answers from dataframe
            if not df.empty:
                results['success'] = True
                print(f"CSV data successfully parsed. Columns: {df.columns.tolist()}")
                
                # Check if we have a Roll No. column
                if 'Roll No.' in df.columns:
                    results['roll_number'] = df['Roll No.'].iloc[0]
                    
                # Check for Test Code column
                if 'Test Code' in df.columns:
                    results['test_code'] = df['Test Code'].iloc[0]
                    
                # Check if we have scores
                if 'Score' in df.columns:
                    results['score'] = float(df['Score'].iloc[0])
                
                # Extract answers from columns
                for col in df.columns:
                    if col.startswith('q') or col.startswith('Q'):
                        results['answers'][col] = df[col].iloc[0]
                
                # If no answers were found in q columns, get all columns except metadata
                if not results['answers']:
                    exclude_cols = ['Roll No.', 'Score', 'Name', 'Email', 'Class', 'Test Code']
                    for col in df.columns:
                        if col not in exclude_cols:
                            results['answers'][col] = df[col].iloc[0]
        
        except Exception as e:
            print(f"Error parsing CSV results: {str(e)}")
            import traceback
            traceback.print_exc()
            results['error'] = f'Error parsing results: {str(e)}'
            
        return results
        
    def _manual_interpretation(self, original_image, output_images):
        """
        Attempt to manually interpret the results from the processed images
        when OMRChecker doesn't produce CSV or JSON output
        
        Args:
            original_image (str): Path to the original image
            output_images (list): List of output image paths
            
        Returns:
            dict: Extracted information
        """
        results = {}
        
        # For now, just indicate that we attempted manual interpretation
        results['manual_interpretation'] = True
        results['message'] = "Manual interpretation attempted - check the debug image for visualization"
        
        return results
    
    def process_template(self, template_path):
        """
        Validate and process a template file
        
        Args:
            template_path (str): Path to the template JSON file
            
        Returns:
            dict: Status of the template processing
        """
        if not os.path.exists(template_path):
            return {'error': 'Template file not found'}
            
        try:
            # Validate JSON format
            with open(template_path, 'r') as f:
                template_data = json.load(f)
                
            # Check required keys
            required_keys = ['bubbleDimensions', 'preProcessors', 'pageDimensions']
            for key in required_keys:
                if key not in template_data:
                    return {'error': f'Template is missing required key: {key}'}
                    
            return {
                'success': True,
                'message': 'Template validated successfully',
                'template': template_data
            }
            
        except json.JSONDecodeError:
            return {'error': 'Invalid JSON format in template file'}
        except Exception as e:
            return {'error': f'Error processing template: {str(e)}'}
    
    def get_vietnamese_template(self):
        """
        Get the Vietnamese template configuration
        
        Returns:
            dict: Vietnamese OMR template configuration
        """
        return VIETNAMESE_TEMPLATE

# Helper function to get a singleton instance
_instance = None

def get_omr_processor(upload_folder, result_folder):
    """Get a singleton instance of the OMRProcessor"""
    global _instance
    if _instance is None:
        _instance = OMRProcessor(upload_folder, result_folder)
    return _instance 