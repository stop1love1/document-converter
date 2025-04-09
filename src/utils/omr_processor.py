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
        
        # Prepare directories for OMRChecker
        try:
            temp_dir, input_dir, output_dir = self._prepare_input_directory(image_path, template_path)
        except Exception as e:
            print(f"Error preparing input directory: {str(e)}")
            return {'error': f'Error preparing input: {str(e)}'}
        
        try:
            # Create a shell script that will run OMRChecker directly as a command-line tool
            script_file = os.path.join(temp_dir, 'run_omr.sh')
            
            with open(script_file, 'w') as f:
                f.write(f"""#!/bin/bash
set -e

# Set up environment
export DISPLAY=:99
export MPLBACKEND=Agg
export QT_QPA_PLATFORM=offscreen
export PYTHONPATH={omr_checker_path}:$PYTHONPATH

# Print environment for debugging
echo "Current directory: $(pwd)"
echo "Python path: $PYTHONPATH"
echo "Input directory: {input_dir}"
echo "Output directory: {output_dir}"

# Change to OMRChecker directory
cd {omr_checker_path}

# Run the main.py script directly with command-line arguments
python main.py --inputDir "{input_dir}" --outputDir "{output_dir}" --noCropping

# Print results
echo "OMRChecker processing completed"
ls -la "{output_dir}"
""")
            
            # Make the script executable
            os.chmod(script_file, 0o755)
            
            print(f"Created script file: {script_file}")
            
            # Execute the script
            cmd = [script_file]
            print(f"Running command: {' '.join(cmd)}")
            
            # Run the process
            process = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                check=False
            )
            
            # Check if the process succeeded
            print(f"Process exit code: {process.returncode}")
            if process.returncode != 0:
                print(f"Error output: {process.stderr}")
                print(f"Standard output: {process.stdout}")
                return {'error': f'OMRChecker process failed: {process.stderr}'}
            
            # Log the output for debugging
            print(f"Process output: {process.stdout[:500]}...")
            
            # Parse results
            return self._parse_results(output_dir, image_path)
            
        except Exception as e:
            print(f"Error processing OMR sheet: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'error': f'Error processing OMR sheet: {str(e)}'}
        finally:
            # Clean up temporary directory
            try:
                print(f"Cleaning up temporary directory: {temp_dir}")
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception as e:
                print(f"Error cleaning up temporary directory: {str(e)}")
    
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
            
            print(f"No result files found in {output_dir}")
            # Check directory contents
            print(f"Directory contents: {os.listdir(output_dir)}")
            results['error'] = 'No results found after processing'
            return results
            
        # Read the CSV file
        try:
            csv_path = str(csv_files[0])
            print(f"Found CSV file: {csv_path}")
            df = pd.read_csv(csv_path)
            
            # Get answers from dataframe
            if not df.empty:
                results['success'] = True
                print(f"CSV data successfully parsed. Columns: {df.columns.tolist()}")
                
                # Check if we have a Roll No. column
                if 'Roll No.' in df.columns:
                    results['roll_number'] = df['Roll No.'].iloc[0]
                    
                # Check if we have scores
                if 'Score' in df.columns:
                    results['score'] = float(df['Score'].iloc[0])
                
                # Extract answers from columns
                for col in df.columns:
                    if col.startswith('q') or col.startswith('Q'):
                        results['answers'][col] = df[col].iloc[0]
                
                # If no answers were found in q columns, get all columns except metadata
                if not results['answers']:
                    exclude_cols = ['Roll No.', 'Score', 'Name', 'Email', 'Class']
                    for col in df.columns:
                        if col not in exclude_cols:
                            results['answers'][col] = df[col].iloc[0]
        
        except Exception as e:
            print(f"Error parsing CSV results: {str(e)}")
            import traceback
            traceback.print_exc()
            results['error'] = f'Error parsing results: {str(e)}'
            
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

# Helper function to get a singleton instance
_instance = None

def get_omr_processor(upload_folder, result_folder):
    """Get a singleton instance of the OMRProcessor"""
    global _instance
    if _instance is None:
        _instance = OMRProcessor(upload_folder, result_folder)
    return _instance 