// Handle tab switching
function openTab(event, tabId) {
    // Prevent the default action
    if (event) {
        event.preventDefault();
    }
    
    // Hide all tab content and remove active class from tab buttons
    const tabContents = document.querySelectorAll('.tab-pane');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    if (!tabContents.length || !tabButtons.length) {
        console.error("Tab elements not found");
        return;
    }
    
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });
    
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show the selected tab and add active class to the clicked button
    const selectedTab = document.getElementById(tabId);
    const selectedButton = document.querySelector(`[data-tab="${tabId}"]`);
    
    if (selectedTab && selectedButton) {
        selectedTab.classList.add('active');
        selectedButton.classList.add('active');
    } else {
        console.error(`Tab or button with ID ${tabId} not found`);
    }
    
    // Clear any previous results
    const resultContainers = document.querySelectorAll('.result-container');
    resultContainers.forEach(container => {
        if (container.id !== 'conversion-history') {
            container.style.display = 'none';
        }
    });
}

// Toggle between light and dark theme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update toggle switch if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = newTheme === 'dark';
    }
}

// Main initialization - Document ready
document.addEventListener("DOMContentLoaded", function () {
    // Theme Toggle
    const themeToggle = document.getElementById("theme-toggle");
    if (!themeToggle) {
        console.error("Theme toggle element not found");
    } else {
        themeToggle.addEventListener('change', function() {
            toggleTheme();
        });
        
        // Initialize theme based on user preference or system preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            themeToggle.checked = savedTheme === 'dark';
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.checked = true;
        }
    }
    
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', function(event) {
                const tabId = this.getAttribute('data-tab');
                if (tabId) {
                    openTab(event, tabId);
                }
            });
        }
    });
    
    // Initialize the first tab
    const defaultTab = document.querySelector('.tab-btn');
    if (defaultTab) {
        const tabId = defaultTab.getAttribute('data-tab');
        if (tabId) {
            openTab(null, tabId);
        }
    }
    
    // Initialize file input
    initFileInput();
    
    // Initialize custom options
    initCustomOptions();
    
    // Initialize history management
    initHistoryManagement();
    
    // Setup form submission
    setupFormSubmission();
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();
    
    // Set up modal close buttons
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', function() {
                const modalId = this.getAttribute('data-modal');
                if (modalId) {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        modal.style.display = 'none';
                    }
                } else {
                    // If no specific modal ID, try to find parent modal
                    const modal = this.closest('.preview-modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                }
            });
        }
    });
    
    // Handle keyboard shortcut button
    // Keyboard shortcuts button
    const shortcutsBtn = document.getElementById('show-shortcuts-btn');
    const shortcutsModal = document.getElementById('keyboard-shortcuts-modal');
    if (shortcutsBtn && shortcutsModal) {
        shortcutsBtn.addEventListener('click', function() {
            shortcutsModal.style.display = 'flex';
        });
        
        // Close button for keyboard shortcuts modal
        const closeShortcutsBtn = document.getElementById('close-shortcuts-modal');
        if (closeShortcutsBtn) {
            closeShortcutsBtn.addEventListener('click', function() {
                shortcutsModal.style.display = 'none';
            });
        }
    }
});

// Initialize file input handling
function initFileInput() {
    // File Upload Tab
    const fileInput = document.getElementById('file-input');
    const fileUploadLabel = document.querySelector('#file-tab .file-upload-label');
    const fileNameElement = document.getElementById('file-name');
    const previewFileBtn = document.getElementById('preview-file-btn');
    
    if (fileInput && fileUploadLabel) {
        // Make the entire label area clickable to trigger file selection
        fileUploadLabel.addEventListener('click', function(e) {
            e.preventDefault();
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                const fileName = this.files[0].name;
                
                if (fileNameElement) {
                    fileNameElement.textContent = fileName;
                    fileNameElement.style.display = 'block';
                }
                
                fileUploadLabel.classList.add('file-selected');
                
                if (previewFileBtn && isFilePreviewable(fileName)) {
                    previewFileBtn.style.display = 'inline-flex';
                }
            } else {
                if (fileNameElement) {
                    fileNameElement.textContent = '';
                    fileNameElement.style.display = 'none';
                }
                
                fileUploadLabel.classList.remove('file-selected');
                
                if (previewFileBtn) {
                    previewFileBtn.style.display = 'none';
                }
            }
        });
    }
    
    // Image Upload Tab
    const imageInput = document.getElementById('image-input');
    const imageUploadLabel = document.querySelector('#image-tab .file-upload-label');
    const imageNameElement = document.getElementById('image-name');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    
    if (imageInput && imageUploadLabel) {
        // Make the entire label area clickable to trigger file selection
        imageUploadLabel.addEventListener('click', function(e) {
            e.preventDefault();
            imageInput.click();
        });
        
        imageInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                const file = this.files[0];
                
                if (imageNameElement) {
                    imageNameElement.textContent = file.name;
                    imageNameElement.style.display = 'block';
                }
                
                imageUploadLabel.classList.add('file-selected');
                
                // Show preview of the image
                if (imagePreviewContainer && imagePreview && file.type.startsWith('image/')) {
                    const fileURL = URL.createObjectURL(file);
                    imagePreview.src = fileURL;
                    imagePreviewContainer.style.display = 'block';
                    
                    // Add event listener to clean up the object URL
                    imagePreview.onload = function() {
                        URL.revokeObjectURL(fileURL);
                    };
                }
                
                const span = imageUploadLabel.querySelector('span');
                if (span) {
                    span.textContent = "Image selected";
                }
                
                // Get file extension for information
                const extension = file.name.split('.').pop().toLowerCase();
                showToast(`Selected image format: ${extension.toUpperCase()}`, 'info');
            } else {
                if (imageNameElement) {
                    imageNameElement.textContent = '';
                    imageNameElement.style.display = 'none';
                }
                
                imageUploadLabel.classList.remove('file-selected');
                
                if (imagePreviewContainer) {
                    imagePreviewContainer.style.display = 'none';
                }
                
                const span = imageUploadLabel.querySelector('span');
                if (span) {
                    span.textContent = "Choose an image or drag it here";
                }
            }
        });
    }
    
    // Handle drag and drop for both containers
    const fileContainers = document.querySelectorAll('.file-upload-container');
    fileContainers.forEach(container => {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (eventName === 'dragenter' || eventName === 'dragover') {
                    this.classList.add('dragover');
                } else {
                    this.classList.remove('dragover');
                    
                    if (eventName === 'drop' && e.dataTransfer.files.length) {
                        // Determine which input to use based on container
                        const input = container.closest('#file-tab') ? fileInput : imageInput;
                        if (input) {
                            input.files = e.dataTransfer.files;
                            const event = new Event('change', { bubbles: true });
                            input.dispatchEvent(event);
                        }
                    }
                }
            }, false);
        });
    });
}

// Check if file can be previewed
function isFilePreviewable(filename) {
    if (!filename) return false;
    
    const previewableExtensions = [
        'pdf', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'svg', 
        'md', 'html', 'htm', 'css', 'js'
    ];
    
    const extension = filename.split('.').pop().toLowerCase();
    return previewableExtensions.includes(extension);
}

// Show file preview in modal
function showFilePreview(filePath, fileType) {
    const modal = document.getElementById('previewModal');
    const modalContent = document.getElementById('previewModalContent');
    
    if (!modal || !modalContent) return;
    
    modalContent.innerHTML = '';
    
    if (fileType === 'image' || /\.(jpg|jpeg|png|gif|svg)$/i.test(filePath)) {
        const img = document.createElement('img');
        img.src = filePath;
        img.className = 'img-fluid preview-image';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '80vh';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        modalContent.appendChild(img);
    } else if (/\.pdf$/i.test(filePath)) {
        const iframe = document.createElement('iframe');
        iframe.src = filePath;
        iframe.style.width = '100%';
        iframe.style.height = '80vh';
        iframe.style.border = 'none';
        
        modalContent.appendChild(iframe);
    } else if (/\.(txt|md|html|htm|css|js)$/i.test(filePath)) {
        fetch(filePath)
            .then(response => response.text())
            .then(content => {
                const pre = document.createElement('pre');
                pre.style.maxHeight = '80vh';
                pre.style.overflow = 'auto';
                pre.style.padding = '15px';
                pre.style.whiteSpace = 'pre-wrap';
                pre.textContent = content;
                
                modalContent.appendChild(pre);
            })
            .catch(error => {
                modalContent.textContent = `Error loading preview: ${error.message}`;
            });
    } else {
        modalContent.textContent = 'Preview not available for this file type';
    }
    
    const previewModal = new bootstrap.Modal(modal);
    previewModal.show();
}

// Show image preview in modal
function showImagePreview(filePath) {
    const modal = document.getElementById('file-preview-modal');
    const contentContainer = document.getElementById('file-preview-content');
    
    if (!modal || !contentContainer) {
        console.error("Image preview modal elements not found");
        return;
    }
    
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Image Preview';
    }
    
    contentContainer.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = filePath;
    img.className = 'img-fluid preview-image';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '80vh';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    
    contentContainer.appendChild(img);
    
    modal.style.display = 'flex';
}

// Format file size in human-readable format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize custom options
function initCustomOptions() {
    // Setup custom options for file, text, and base64 tabs
    setupCustomOption('file');
    setupCustomOption('text');
    setupCustomOption('base64');
    
    // Setup existing options selects
    const optionsSelects = document.querySelectorAll('.options-select');
    optionsSelects.forEach(select => {
        if (select) {
            // Update the hidden input when options change
            select.addEventListener('change', function() {
                const tabId = this.id.split('-')[0]; // file, text, or base64
                updateOptions(tabId);
            });
        }
    });
}

// Setup custom option input and button
function setupCustomOption(tabId) {
    const addBtn = document.getElementById(`${tabId}-add-option`);
    const customInput = document.getElementById(`${tabId}-custom-option`);
    
    if (addBtn && customInput) {
        // Add option when button is clicked
        addBtn.addEventListener('click', function() {
            addCustomOption(tabId, customInput.value);
            customInput.value = '';
        });
        
        // Add option when Enter is pressed in the input
        customInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addBtn.click();
            }
        });
    } else {
        console.warn(`Custom option elements not found for ${tabId} tab`);
    }
}

// Add a custom option to the selected options
function addCustomOption(tabId, option) {
    if (!option.trim()) {
        showToast('Please enter an option', 'error');
        return;
    }
    
    // Get the correct container and hidden input
    const selectedOptionsContainer = document.getElementById(`${tabId}-selected-options`);
    const hiddenInput = document.getElementById(`${tabId}-options`);
    
    if (!selectedOptionsContainer || !hiddenInput) {
        console.error(`Selected options container or hidden input not found for ${tabId}`);
        return;
    }
    
    // Create selected option tag
    const tag = document.createElement('span');
    tag.className = 'selected-option';
    tag.innerHTML = `${option} <i class="fas fa-times"></i>`;
    
    // Add remove functionality to the tag
    tag.querySelector('i').addEventListener('click', function() {
        tag.remove();
        updateOptions(tabId);
    });
    
    // Add tag to container
    selectedOptionsContainer.appendChild(tag);
    
    // Update hidden input
    updateOptions(tabId);
    
    // Show success message
    showToast(`Option "${option}" added`, 'success');
}

// Update the hidden input with all selected options
function updateOptions(tabId) {
    const selectedOptionsContainer = document.getElementById(`${tabId}-selected-options`);
    const select = document.getElementById(`${tabId}-options-select`);
    const hiddenInput = document.getElementById(`${tabId}-options`);
    
    if (!selectedOptionsContainer || !hiddenInput) {
        console.error(`Selected options elements not found for ${tabId}`);
        return;
    }
    
    let options = [];
    
    // Get options from the select element
    if (select) {
        Array.from(select.selectedOptions).forEach(option => {
            options.push(option.value);
        });
    }
    
    // Get options from the custom tags
    const tags = selectedOptionsContainer.querySelectorAll('.selected-option');
    tags.forEach(tag => {
        const optionText = tag.textContent.trim().replace('×', '').trim();
        options.push(optionText);
    });
    
    // Remove duplicates
    options = [...new Set(options)];
    
    // Update the hidden input
    hiddenInput.value = options.join(',');
}

// Initialize history management
function initHistoryManagement() {
    // Display conversion history
    displayConversionHistory();
    
    // Add event listeners to clear and download history buttons
    const clearHistoryBtn = document.getElementById('clear-history');
    const downloadAllHistoryBtn = document.getElementById('download-all-history');
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearConversionHistory);
    }
    
    if (downloadAllHistoryBtn) {
        downloadAllHistoryBtn.addEventListener('click', downloadAllHistory);
    }
    
    // Set up modal close functionality
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal, .preview-modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });
}

// Display conversion history
function displayConversionHistory() {
    const historyList = document.getElementById("history-list");
    if (!historyList) {
        console.error("History list element not found");
        return;
    }
    
    const history = JSON.parse(localStorage.getItem("conversion_history") || "[]");
    
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No conversion history yet</div>';
        return;
    }
    
    // Use template for history items
    const template = document.getElementById('history-item-template');
    if (!template) {
        console.error("History item template not found");
        historyList.innerHTML = '<div class="error-message">Template error: Could not load history template</div>';
        return;
    }
    
    history.forEach((item, index) => {
        try {
            const historyItem = template.content.cloneNode(true);
            
            // Fill in the template data
            const filenameEl = historyItem.querySelector('.filename');
            const fromFormatEl = historyItem.querySelector('.from-format');
            const toFormatEl = historyItem.querySelector('.to-format');
            const timestampEl = historyItem.querySelector('.history-timestamp');
            
            if (filenameEl) filenameEl.textContent = item.name || 'Unknown file';
            if (fromFormatEl) fromFormatEl.textContent = item.from || 'Unknown';
            if (toFormatEl) toFormatEl.textContent = item.to || 'Unknown';
            
            // Format date
            if (timestampEl && item.date) {
                try {
                    const date = new Date(item.date);
                    const formatted = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                    timestampEl.textContent = formatted;
                } catch (e) {
                    console.error("Date formatting error:", e);
                    timestampEl.textContent = 'Unknown date';
                }
            }
            
            // Set download action
            const downloadBtn = historyItem.querySelector('.history-download-btn');
            if (downloadBtn) {
                if (item.isFile && item.downloadUrl) {
                    downloadBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent item click event
                        window.location.href = item.downloadUrl;
                    });
                } else if (item.content) {
                    downloadBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent item click event
                        // Create a temporary link to download text content
                        const blob = new Blob([item.content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `converted-${item.from}-to-${item.to}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    });
                } else {
                    // No download available, hide the button
                    downloadBtn.style.display = 'none';
                }
            }
            
            // Set preview action
            const previewBtn = historyItem.querySelector('.history-preview-btn');
            if (previewBtn) {
                if (item.content) {
                    previewBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent item click event
                        showContentPreview(item.content, `${item.name} (${item.from} to ${item.to})`);
                    });
                } else if (item.downloadUrl && item.downloadUrl.match(/\.(jpg|jpeg|png|gif|svg|pdf)$/i)) {
                    // For image and PDF files, we can show them directly
                    previewBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent item click event
                        
                        const previewModal = document.getElementById('content-preview-modal');
                        const previewContent = document.getElementById('content-preview-container');
                        
                        if (!previewModal || !previewContent) {
                            console.error("Preview modal elements not found");
                            return;
                        }
                        
                        const modalTitle = previewModal.querySelector('.modal-title');
                        
                        const iframe = document.createElement('iframe');
                        iframe.src = item.downloadUrl;
                        iframe.style.width = '100%';
                        iframe.style.height = '600px';
                        
                        if (modalTitle) modalTitle.textContent = item.name || 'File preview';
                        previewContent.innerHTML = '';
                        previewContent.appendChild(iframe);
                        previewModal.style.display = 'flex';
                    });
                } else {
                    // No preview available, hide the button
                    previewBtn.style.display = 'none';
                }
            }
            
            // Set delete action
            const deleteBtn = historyItem.querySelector('.history-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent item click event
                    removeHistoryItem(index);
                });
            }
            
            // Add the item to the list
            historyList.appendChild(historyItem);
        } catch (e) {
            console.error("Error rendering history item:", e);
        }
    });
}

// Remove history item
function removeHistoryItem(index) {
    let history = JSON.parse(localStorage.getItem('conversion_history') || '[]');
    
    if (index >= 0 && index < history.length) {
        history.splice(index, 1);
        localStorage.setItem('conversion_history', JSON.stringify(history));
        displayConversionHistory();
        showToast('History item removed', 'info');
    }
}

// Clear all conversion history
function clearConversionHistory() {
    if (confirm('Are you sure you want to clear all conversion history?')) {
        localStorage.removeItem('conversion_history');
        displayConversionHistory();
        showToast('Conversion history cleared', 'info');
    }
}

// Download all history
function downloadAllHistory() {
    const history = JSON.parse(localStorage.getItem('conversion_history') || '[]');
    
    if (history.length === 0) {
        showToast('No conversion history to download', 'error');
        return;
    }
    
    // Create a JSON file with the history
    const historyJson = JSON.stringify(history, null, 2);
    const blob = new Blob([historyJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link to download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversion_history.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('History downloaded', 'success');
}

// Show content preview
function showContentPreview(content, title) {
    const previewModal = document.getElementById('content-preview-modal');
    const previewContent = document.getElementById('content-preview-container');
    
    if (!previewModal || !previewContent) {
        console.error("Preview modal elements not found");
        return;
    }
    
    const modalTitle = previewModal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.textContent = title || 'Content Preview';
    }
    
    previewContent.innerHTML = '';
    
    // Create pre element for proper formatting
    const pre = document.createElement('pre');
    pre.className = 'text-preview';
    pre.textContent = content;
    previewContent.appendChild(pre);
    
    previewModal.style.display = 'flex';
}

// Setup form submission
function setupFormSubmission() {
    const fileForm = document.getElementById('file-form');
    const textForm = document.getElementById('text-form');
    const base64Form = document.getElementById('base64-form');
    const imageForm = document.getElementById('image-form');
    
    // Quick format buttons for image
    const imageQuickFormatBtns = document.querySelectorAll('#image-tab .quick-format-btn');
    imageQuickFormatBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const toFormat = this.getAttribute('data-to');
            const formatSelect = document.getElementById('image-to-format');
            
            if (toFormat && formatSelect) {
                for (let i = 0; i < formatSelect.options.length; i++) {
                    if (formatSelect.options[i].value === toFormat) {
                        formatSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Tự động submit form nếu đã chọn ảnh
            const imageInput = document.getElementById('image-input');
            if (imageInput && imageInput.files.length > 0) {
                imageForm.requestSubmit();
            } else {
                showToast('Please select an image first', 'warning');
                // Focus vào input để user chọn ảnh
                imageInput.click();
            }
        });
    });
    
    // File conversion
    if (fileForm) {
        fileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("File form submitted");
            
            const fileInput = document.getElementById('file-input');
            if (!fileInput.files.length) {
                showToast('Please select a file', 'error');
                return;
            }
            
            const fromFormat = document.getElementById('file-from-format').value;
            const toFormat = document.getElementById('file-to-format').value;
            
            if (!fromFormat || !toFormat) {
                showToast('Please select both from and to formats', 'error');
                return;
            }
            
            showProgressBar();
            
            // Create FormData to send file
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('conversion_type', 'file');
            formData.append('from_format', fromFormat);
            formData.append('to_format', toFormat);
            
            // Get selected options if any
            const options = document.getElementById('file-options').value;
            if (options) {
                formData.append('options', options);
            }
            
            fetch('/convert', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                hideProgressBar();
                console.log("API response:", data);
                
                if (data.error) {
                    showToast(data.error, 'error');
                    return;
                }
                
                // Save to history
                const historyItem = {
                    name: fileInput.files[0].name,
                    from: fromFormat,
                    to: toFormat,
                    date: new Date().toISOString(),
                    isFile: true,
                    downloadUrl: data.downloadUrl || data.download_url
                };
                
                addToHistory(historyItem);
                
                // Display result
                displayFileResult(data, toFormat);
            })
            .catch(error => {
                hideProgressBar();
                console.error('Error:', error);
                showToast('Error converting file: ' + error.message, 'error');
            });
        });
    }
    
    // Image conversion
    if (imageForm) {
        imageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("Image form submitted");
            
            const imageInput = document.getElementById('image-input');
            const toFormat = document.getElementById('image-to-format').value;
            
            if (!imageInput.files || imageInput.files.length === 0) {
                showToast('Please select an image', 'error');
                return;
            }
            
            if (!toFormat) {
                showToast('Please select an output format', 'error');
                return;
            }
            
            // Show loading state
            showLoadingOverlay('Converting image...');
            
            const formData = new FormData();
            formData.append('image', imageInput.files[0]);
            
            // For regular image conversion
            formData.append('to_format', toFormat);
            
            // Add quality if available
            const qualityInput = document.getElementById('image-quality');
            if (qualityInput && qualityInput.value) {
                formData.append('quality', qualityInput.value);
            }
            
            // Add resize if available
            const resizeInput = document.getElementById('image-resize');
            if (resizeInput && resizeInput.value) {
                formData.append('resize', resizeInput.value);
            }
            
            // Add options if available
            const optionsInput = document.getElementById('image-options');
            if (optionsInput && optionsInput.value) {
                formData.append('options', optionsInput.value);
            }
            
            fetch('/convert/image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                hideLoadingOverlay();
                if (data.error) {
                    showToast(data.error, 'error');
                } else {
                    displayImageResult(data.downloadUrl, toFormat, data.base64);
                    showToast('Image converted successfully', 'success');
                }
            })
            .catch(error => {
                hideLoadingOverlay();
                console.error('Error:', error);
                showToast('An error occurred while converting the image', 'error');
            });
        });
    }
    
    // Text conversion
    if (textForm) {
        textForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("Text form submitted");
            
            const textContent = document.getElementById('text-content');
            if (!textContent || !textContent.value.trim()) {
                showToast('Please enter text to convert', 'error');
                return;
            }
            
            const fromFormat = document.getElementById('text-from-format').value;
            const toFormat = document.getElementById('text-to-format').value;
            
            if (!fromFormat || !toFormat) {
                showToast('Please select both from and to formats', 'error');
                return;
            }
            
            showProgressBar();
            
            // Create FormData to send text
            const formData = new FormData();
            formData.append('text', textContent.value);
            formData.append('conversion_type', 'text');
            formData.append('from_format', fromFormat);
            formData.append('to_format', toFormat);
            
            // Get selected options if any
            const options = document.getElementById('text-options').value;
            if (options) {
                formData.append('options', options);
            }
            
            fetch('/convert', {  // Changed from /api/convert/text to /convert
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                hideProgressBar();
                console.log("API response:", data);
                
                if (data.error) {
                    showToast(data.error, 'error');
                    return;
                }
                
                // Save to history
                const historyItem = {
                    name: 'Text conversion',
                    from: fromFormat,
                    to: toFormat,
                    date: new Date().toISOString(),
                    content: data.result || data.content
                };
                
                addToHistory(historyItem);
                
                // Display result
                displayTextResult(data.result || data.content);
            })
            .catch(error => {
                hideProgressBar();
                console.error('Error:', error);
                showToast('Error converting text: ' + error.message, 'error');
            });
        });
    }
    
    // Base64 conversion
    if (base64Form) {
        base64Form.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("Base64 form submitted");
            
            const base64Input = document.getElementById('base64-input');
            if (!base64Input || !base64Input.value.trim()) {
                showToast('Please enter base64 content to convert', 'error');
                return;
            }
            
            const fromFormat = document.getElementById('base64-from-format').value;
            const toFormat = document.getElementById('base64-to-format').value;
            
            if (!fromFormat || !toFormat) {
                showToast('Please select both from and to formats', 'error');
                return;
            }
            
            showProgressBar();
            
            // Create FormData to send base64
            const formData = new FormData();
            formData.append('base64_data', base64Input.value);
            formData.append('conversion_type', 'base64');
            formData.append('from_format', fromFormat);
            formData.append('to_format', toFormat);
            
            // Get selected options if any
            const options = document.getElementById('base64-options').value;
            if (options) {
                formData.append('options', options);
            }
            
            fetch('/convert', {  // Changed from /api/convert/base64 to /convert
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                hideProgressBar();
                console.log("API response:", data);
                
                if (data.error) {
                    showToast(data.error, 'error');
                    return;
                }
                
                // Save to history
                const historyItem = {
                    name: 'Base64 conversion',
                    from: fromFormat,
                    to: toFormat,
                    date: new Date().toISOString(),
                    isFile: Boolean(data.downloadUrl || data.download_url),
                    downloadUrl: data.downloadUrl || data.download_url,
                    content: data.result || data.content
                };
                
                addToHistory(historyItem);
                
                // Display result based on response type
                if (data.downloadUrl || data.download_url) {
                    displayBase64Result(data.downloadUrl || data.download_url);
                } else if (data.result || data.content) {
                    displayBase64Result(null, data.result || data.content);
                }
            })
            .catch(error => {
                hideProgressBar();
                console.error('Error:', error);
                showToast('Error converting base64: ' + error.message, 'error');
            });
        });
    }
}

// Add to conversion history
function addToHistory(item) {
    let history = JSON.parse(localStorage.getItem('conversion_history') || '[]');
    history.unshift(item); // Add to beginning of array
    
    // Limit history to 20 items
    if (history.length > 20) {
        history = history.slice(0, 20);
    }
    
    localStorage.setItem('conversion_history', JSON.stringify(history));
    
    // Update UI if on history tab
    displayConversionHistory();
}

// Function to display file conversion result
function displayFileResult(result, outputFormat) {
    const resultContainer = document.getElementById('file-result-container');
    const resultContent = document.getElementById('file-result-content');
    
    if (!resultContainer || !resultContent) {
        console.error("File result elements not found");
        return;
    }
    
    // Show result container
    resultContainer.style.display = 'block';
    
    // Clear previous content
    resultContent.innerHTML = '';
    
    if (result.downloadUrl) {
        // Create preview of the result if possible
        const downloadBtn = document.getElementById('file-download-btn');
        if (downloadBtn) {
            downloadBtn.href = result.downloadUrl;
            downloadBtn.style.display = 'inline-flex';
        }
        
        // If output is an image, show it
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(outputFormat)) {
            const img = document.createElement('img');
            img.src = result.downloadUrl;
            img.className = 'result-image';
            img.alt = 'Converted file';
            resultContent.appendChild(img);
        } else {
            // For other formats, show a link and info
            const info = document.createElement('div');
            info.className = 'result-info';
            info.innerHTML = `
                <p><i class="fas fa-check-circle"></i> File converted successfully!</p>
                <p>You can download the converted file using the button above.</p>
            `;
            resultContent.appendChild(info);
        }
    } else {
        // Show error
        const error = document.createElement('div');
        error.className = 'error';
        error.textContent = 'Error generating download link';
        resultContent.appendChild(error);
    }
    
    // Scroll to result
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Display text result
function displayTextResult(text) {
    const resultContainer = document.getElementById('text-result-container');
    const resultContent = document.getElementById('text-result-content');
    
    if (!resultContainer || !resultContent) {
        console.error("Text result elements not found");
        return;
    }
    
    resultContent.innerHTML = '';
    
    if (text) {
        const pre = document.createElement('pre');
        pre.className = 'result-text';
        pre.textContent = text;
        resultContent.appendChild(pre);
        
        // Update copy button
        const copyBtn = document.getElementById('text-copy-btn');
        if (copyBtn) {
            // Remove previous listeners
            const newCopyBtn = copyBtn.cloneNode(true);
            if (copyBtn.parentNode) {
                copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
            }
            
            newCopyBtn.addEventListener('click', function() {
                navigator.clipboard.writeText(text)
                    .then(() => {
                        showToast('Copied to clipboard', 'success');
                    })
                    .catch(err => {
                        console.error('Failed to copy: ', err);
                        showToast('Failed to copy to clipboard', 'error');
                    });
            });
        }
        
        // Update preview button
        const previewBtn = document.getElementById('text-preview-btn');
        if (previewBtn) {
            // Remove previous listeners
            const newPreviewBtn = previewBtn.cloneNode(true);
            if (previewBtn.parentNode) {
                previewBtn.parentNode.replaceChild(newPreviewBtn, previewBtn);
            }
            
            newPreviewBtn.addEventListener('click', function() {
                showContentPreview(text, 'Text Conversion Result');
            });
        }
    } else {
        resultContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> No text result provided
            </div>
        `;
    }
    
    resultContainer.style.display = 'block';
}

// Display base64 result
function displayBase64Result(downloadUrl, text) {
    const resultContainer = document.getElementById('base64-result-container');
    const resultContent = document.getElementById('base64-result-content');
    
    if (!resultContainer || !resultContent) {
        console.error("Base64 result elements not found");
        return;
    }
    
    resultContent.innerHTML = '';
    
    if (downloadUrl) {
        // Check if it's an image to display preview
        if (downloadUrl.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
            const img = document.createElement('img');
            img.src = downloadUrl;
            img.style.maxWidth = '100%';
            img.alt = 'Converted image';
            resultContent.appendChild(img);
        } 
        // Check if it's a PDF to display preview
        else if (downloadUrl.match(/\.pdf$/i)) {
            const iframe = document.createElement('iframe');
            iframe.src = downloadUrl;
            iframe.style.width = '100%';
            iframe.style.height = '500px';
            resultContent.appendChild(iframe);
        }
        // Default file result
        else {
            resultContent.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i> Base64 converted successfully
                </div>
                <p>Your file is ready to download.</p>
            `;
        }
        
        // Update download button
        const downloadBtn = document.getElementById('base64-download-btn');
        if (downloadBtn) {
            // Remove previous listeners
            const newDownloadBtn = downloadBtn.cloneNode(true);
            if (downloadBtn.parentNode) {
                downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
            }
            
            newDownloadBtn.addEventListener('click', function() {
                window.location.href = downloadUrl;
            });
        }
    } else if (text) {
        const pre = document.createElement('pre');
        pre.className = 'result-text';
        pre.textContent = text;
        resultContent.appendChild(pre);
        
        // Update copy button
        const copyBtn = document.getElementById('base64-copy-btn');
        if (copyBtn) {
            // Remove previous listeners
            const newCopyBtn = copyBtn.cloneNode(true);
            if (copyBtn.parentNode) {
                copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
            }
            
            newCopyBtn.addEventListener('click', function() {
                navigator.clipboard.writeText(text)
                    .then(() => {
                        showToast('Copied to clipboard', 'success');
                    })
                    .catch(err => {
                        console.error('Failed to copy: ', err);
                        showToast('Failed to copy to clipboard', 'error');
                    });
            });
        }
    } else {
        resultContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> No result provided
            </div>
        `;
    }
    
    resultContainer.style.display = 'block';
}

// Show progress bar
function showProgressBar() {
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    
    if (!progressContainer || !progressBar) {
        console.error("Progress elements not found");
        return;
    }
    
    progressBar.style.width = '0%';
    progressContainer.style.display = 'block';
    
    let width = 0;
    const interval = setInterval(function() {
        if (width >= 90) {
            clearInterval(interval);
        } else {
            width += Math.random() * 10;
            if (width > 90) width = 90;
            progressBar.style.width = width + '%';
        }
    }, 200);
    
    return interval;
}

// Hide progress bar
function hideProgressBar() {
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    
    if (!progressContainer || !progressBar) {
        console.error("Progress elements not found");
        return;
    }
    
    progressBar.style.width = '100%';
    
    setTimeout(function() {
        progressContainer.style.display = 'none';
    }, 300);
}

// Alias functions for loading overlay (to fix missing function errors)
function showLoadingOverlay(message) {
    // You can optionally display the message somewhere if needed
    console.log(message);
    return showProgressBar();
}

function hideLoadingOverlay() {
    return hideProgressBar();
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Add icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="toast-content">${message}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            toast.classList.add('toast-fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, 5000);
}

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Alt + key combinations
        if (e.altKey) {
            switch (e.key) {
                case 'f':
                    e.preventDefault();
                    const fileTab = document.querySelector('[data-tab="file-tab"]');
                    if (fileTab) fileTab.click();
                    break;
                case 't':
                    e.preventDefault();
                    const textTab = document.querySelector('[data-tab="text-tab"]');
                    if (textTab) textTab.click();
                    break;
                case 'b':
                    e.preventDefault();
                    const base64Tab = document.querySelector('[data-tab="base64-tab"]');
                    if (base64Tab) base64Tab.click();
                    break;
                case 'c':
                    e.preventDefault();
                    const activeTab = document.querySelector('.tab-pane.active');
                    if (activeTab) {
                        const submitBtn = activeTab.querySelector('button[type="submit"]');
                        if (submitBtn) submitBtn.click();
                    }
                    break;
                case 'k':
                    e.preventDefault();
                    const shortcutsModal = document.getElementById('keyboard-shortcuts-modal');
                    if (shortcutsModal) {
                        shortcutsModal.style.display = shortcutsModal.style.display === 'flex' ? 'none' : 'flex';
                    }
                    break;
                case 'd':
                    e.preventDefault();
                    toggleTheme();
                    break;
            }
        }
    });
}

// Display image result
function displayImageResult(downloadUrl, format, base64Data = null) {
    const resultContainer = document.getElementById('image-result-container');
    const resultImage = document.getElementById('image-result-preview');
    const downloadBtn = document.getElementById('image-download-btn');
    
    if (!resultContainer || !resultImage || !downloadBtn) {
        console.error("Image result elements not found");
        return;
    }
    
    // Show result container
    resultContainer.style.display = 'block';
    
    // Display the converted image
    resultImage.src = downloadUrl;
    resultImage.style.display = 'block';
    
    // Store base64 data as a data attribute if available
    if (base64Data) {
        resultImage.setAttribute('data-base64', base64Data);
        
        // Add a copy base64 button if it doesn't exist
        let copyBase64Btn = document.getElementById('copy-base64-btn');
        if (!copyBase64Btn) {
            copyBase64Btn = document.createElement('button');
            copyBase64Btn.id = 'copy-base64-btn';
            copyBase64Btn.className = 'btn btn-sm';
            copyBase64Btn.innerHTML = '<i class="fas fa-copy"></i> Copy Base64';
            copyBase64Btn.style.marginLeft = '10px';
            
            // Insert the button next to download button
            downloadBtn.parentNode.insertBefore(copyBase64Btn, downloadBtn.nextSibling);
            
            // Add click event to copy base64 data
            copyBase64Btn.addEventListener('click', function() {
                const base64 = resultImage.getAttribute('data-base64');
                if (base64) {
                    navigator.clipboard.writeText(base64)
                        .then(() => {
                            showToast('Base64 data copied to clipboard', 'success');
                        })
                        .catch(err => {
                            console.error('Failed to copy: ', err);
                            showToast('Failed to copy base64 data', 'error');
                        });
                }
            });
        }
        
        // Make sure the button is visible
        copyBase64Btn.style.display = 'inline-flex';
    }
    
    // Update download button
    downloadBtn.href = downloadUrl;
    
    // Scroll to result
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Setup quick format buttons for image conversion
const quickFormatButtons = document.querySelectorAll('.quick-format-btn');
quickFormatButtons.forEach(button => {
    button.addEventListener('click', function() {
        const format = this.getAttribute('data-to');
        const formatSelect = document.querySelector('#image-to-format');
        if (formatSelect) {
            formatSelect.value = format;
            
            // ... existing code ...
        }
    });
});

// Handle image form submission
document.getElementById('image-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const imageInput = document.getElementById('image-input');
    const toFormat = document.getElementById('image-to-format').value;
    
    if (!imageInput.files || imageInput.files.length === 0) {
        showToast('Please select an image', 'error');
        return;
    }
    
    if (!toFormat) {
        showToast('Please select an output format', 'error');
        return;
    }
    
    // Show loading state
    showLoadingOverlay('Converting image...');
    
    const formData = new FormData();
    formData.append('image', imageInput.files[0]);
    
    // For regular image conversion
    formData.append('to_format', toFormat);
    
    // Add quality if available
    const qualityInput = document.getElementById('image-quality');
    if (qualityInput && qualityInput.value) {
        formData.append('quality', qualityInput.value);
    }
    
    // Add resize if available
    const resizeInput = document.getElementById('image-resize');
    if (resizeInput && resizeInput.value) {
        formData.append('resize', resizeInput.value);
    }
    
    // Add options if available
    const optionsInput = document.getElementById('image-options');
    if (optionsInput && optionsInput.value) {
        formData.append('options', optionsInput.value);
    }
    
    fetch('/convert/image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoadingOverlay();
        if (data.error) {
            showToast(data.error, 'error');
        } else {
            displayImageResult(data.downloadUrl, toFormat, data.base64);
            showToast('Image converted successfully', 'success');
        }
    })
    .catch(error => {
        hideLoadingOverlay();
        console.error('Error:', error);
        showToast('An error occurred while converting the image', 'error');
    });
});
