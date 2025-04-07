document.addEventListener("DOMContentLoaded", function () {
    // Theme Toggle
    const themeToggle = document.getElementById("theme-toggle");
    const html = document.documentElement;
    
    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem("theme") || 
                      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    
    // Apply the theme
    applyTheme(savedTheme);
    
    themeToggle.addEventListener("change", function() {
        const theme = this.checked ? "dark" : "light";
        applyTheme(theme);
        localStorage.setItem("theme", theme);
    });
    
    function applyTheme(theme) {
        html.setAttribute("data-theme", theme);
        themeToggle.checked = theme === "dark";
    }
    
    // Keyboard Shortcuts
    const shortcutsBtn = document.getElementById("show-shortcuts-btn");
    const shortcutsModal = document.getElementById("keyboard-shortcuts-modal");
    const closeShortcutsBtn = document.getElementById("close-shortcuts-modal");
    
    shortcutsBtn.addEventListener("click", toggleShortcutsModal);
    closeShortcutsBtn.addEventListener("click", toggleShortcutsModal);
    
    function toggleShortcutsModal() {
        if (shortcutsModal.style.display === "flex") {
            shortcutsModal.style.display = "none";
        } else {
            shortcutsModal.style.display = "flex";
        }
    }
    
    // Close modal when clicking outside
    shortcutsModal.addEventListener("click", function(e) {
        if (e.target === shortcutsModal) {
            shortcutsModal.style.display = "none";
        }
    });
    
    // Register keyboard shortcuts
    document.addEventListener("keydown", function(e) {
        // Alt + key combinations
        if (e.altKey) {
            switch(e.key) {
                case "f":
                    e.preventDefault();
                    document.querySelector('[data-tab="file-tab"]').click();
                    break;
                case "t":
                    e.preventDefault();
                    document.querySelector('[data-tab="text-tab"]').click();
                    break;
                case "b":
                    e.preventDefault();
                    document.querySelector('[data-tab="base64-tab"]').click();
                    break;
                case "c":
                    e.preventDefault();
                    const activeTab = document.querySelector('.tab-pane.active');
                    if (activeTab) {
                        const submitBtn = activeTab.querySelector('button[type="submit"]');
                        if (submitBtn) submitBtn.click();
                    }
                    break;
                case "k":
                    e.preventDefault();
                    toggleShortcutsModal();
                    break;
                case "d":
                    e.preventDefault();
                    themeToggle.click();
                    break;
            }
        }
    });
    
    // Quick Format buttons
    const quickFormatBtns = document.querySelectorAll(".quick-format-btn");
    
    quickFormatBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const fromFormat = btn.getAttribute("data-from");
            const toFormat = btn.getAttribute("data-to");
            
            const fromFormatSelect = document.getElementById("file-from-format");
            const toFormatSelect = document.getElementById("file-to-format");
            
            if (fromFormatSelect && toFormatSelect) {
                selectOptionByValue(fromFormatSelect, fromFormat);
                selectOptionByValue(toFormatSelect, toFormat);
            }
        });
    });
    
    // Quick option buttons
    const quickOptionButtons = document.querySelectorAll(".quick-option-btn");
    
    quickOptionButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const option = btn.getAttribute("data-option");
            const tabId = document.querySelector(".tab-pane.active").id;
            const optionsInput = document.getElementById(`${tabId.split("-")[0]}-options`);
            const selectedOptionsContainer = document.getElementById(`${tabId.split("-")[0]}-selected-options`);
            
            if (optionsInput) {
                let currentOptions = optionsInput.value;
                
                if (!currentOptions.includes(option)) {
                    if (currentOptions.trim() !== "") {
                        currentOptions += " ";
                    }
                    currentOptions += option;
                    optionsInput.value = currentOptions;
                    
                    addOptionTag(option, selectedOptionsContainer, optionsInput);
                }
            }
        });
    });
    
    // Initialize selected options display
    initializeSelectedOptions("file-options", "file-selected-options");
    initializeSelectedOptions("text-options", "text-selected-options");
    initializeSelectedOptions("base64-options", "base64-selected-options");
    
    // Recent formats tracking
    function addRecentFormat(type, format) {
        const key = `recent_${type}_formats`;
        let recentFormats = JSON.parse(localStorage.getItem(key) || "[]");
        
        // Don't add duplicates
        if (!recentFormats.includes(format)) {
            // Add to the front, limit to 5 items
            recentFormats.unshift(format);
            recentFormats = recentFormats.slice(0, 5);
            localStorage.setItem(key, JSON.stringify(recentFormats));
            
            // Update UI
            displayRecentFormats(type);
        }
    }
    
    function displayRecentFormats(type) {
        const key = `recent_${type}_formats`;
        const recentFormats = JSON.parse(localStorage.getItem(key) || "[]");
        const container = document.getElementById(`recent-${type}-formats`);
        
        container.innerHTML = '';
        
        recentFormats.forEach(format => {
            const tag = document.createElement("span");
            tag.className = "format-tag";
            tag.textContent = format;
            tag.addEventListener("click", () => {
                // Set the clicked format in the input field
                const inputField = document.querySelector(`.tab-pane.active [id$="-${type}-format"]`);
                if (inputField) {
                    selectOptionByValue(inputField, format);
                }
            });
            container.appendChild(tag);
        });
    }
    
    // Initialize recent formats
    displayRecentFormats("from");
    displayRecentFormats("to");
    
    // Conversion history
    function saveConversionToHistory(from, to, fileOrTextName) {
        const history = JSON.parse(localStorage.getItem("conversion_history") || "[]");
        
        // Add new conversion at the beginning
        history.unshift({
            id: Date.now(),
            from: from,
            to: to,
            name: fileOrTextName || "Untitled conversion",
            date: new Date().toISOString()
        });
        
        // Limit to 20 items
        const limitedHistory = history.slice(0, 20);
        localStorage.setItem("conversion_history", JSON.stringify(limitedHistory));
        
        // Update UI
        displayConversionHistory();
    }
    
    function displayConversionHistory() {
        const historyList = document.getElementById("history-list");
        if (!historyList) return;
        
        const history = JSON.parse(localStorage.getItem("conversion_history")) || [];
        
        historyList.innerHTML = '';
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="empty-history">No conversion history yet</div>';
            return;
        }
        
        // Use template for history items
        const template = document.getElementById('history-item-template');
        
        history.forEach((item, index) => {
            const historyItem = template.content.cloneNode(true);
            
            // Fill in the template data
            historyItem.querySelector('.filename').textContent = item.name;
            historyItem.querySelector('.from-format').textContent = item.from;
            historyItem.querySelector('.to-format').textContent = item.to;
            
            // Format date
            const date = new Date(item.date);
            const formatted = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            historyItem.querySelector('.history-timestamp').textContent = formatted;
            
            // Set download action
            const downloadBtn = historyItem.querySelector('.history-download-btn');
            if (item.isFile && item.downloadUrl) {
                downloadBtn.addEventListener('click', () => {
                    window.location.href = item.downloadUrl;
                });
            } else if (item.content || item.base64Result) {
                downloadBtn.addEventListener('click', () => {
                    // Create a temporary link to download text content
                    const content = item.base64Result || item.content;
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `converted-${item.from}-to-${item.to}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
            }
            
            // Set delete action
            const deleteBtn = historyItem.querySelector('.history-delete-btn');
            deleteBtn.addEventListener('click', () => {
                removeHistoryItem(index);
            });
            
            historyList.appendChild(historyItem);
        });
    }
    
    function removeHistoryItem(index) {
        let history = JSON.parse(localStorage.getItem("conversion_history")) || [];
        
        history.splice(index, 1);
        
        localStorage.setItem("conversion_history", JSON.stringify(history));
        
        // Update display
        displayConversionHistory();
    }
    
    function clearConversionHistory() {
        localStorage.removeItem("conversion_history");
        displayConversionHistory();
    }
    
    function downloadAllHistory() {
        const history = JSON.parse(localStorage.getItem("conversion_history")) || [];
        
        if (history.length === 0) {
            alert('No conversion history to download');
            return;
        }
        
        // Show loading indicator
        const downloadBtn = document.getElementById('download-all-history');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        downloadBtn.disabled = true;
        
        // Send the history data to the API
        fetch('/api/history/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(history)
        })
        .then(response => {
            // Reset button
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
            
            if (!response.ok) {
                throw new Error('Failed to generate ZIP file');
            }
            
            return response.blob();
        })
        .then(blob => {
            // Create a download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversion-history-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error downloading history:', error);
            alert('Failed to download conversion history. Please try again later.');
            
            // Reset button
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        });
    }
    
    // Initialize event listeners for the history actions
    document.addEventListener('DOMContentLoaded', function() {
        // Display conversion history
        displayConversionHistory();
        
        // Clear history button
        const clearHistoryBtn = document.getElementById('clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', clearConversionHistory);
        }
        
        // Download all history button
        const downloadAllHistoryBtn = document.getElementById('download-all-history');
        if (downloadAllHistoryBtn) {
            downloadAllHistoryBtn.addEventListener('click', downloadAllHistory);
        }
    });
    
    // Tab switching
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabButtons.forEach((button) => {
        button.addEventListener("click", function () {
            // Remove active class from all buttons and panes
            tabButtons.forEach((btn) => btn.classList.remove("active"));
            tabPanes.forEach((pane) => pane.classList.remove("active"));

            // Add active class to clicked button
            this.classList.add("active");

            // Show corresponding pane
            const tabId = this.getAttribute("data-tab");
            document.getElementById(tabId).classList.add("active");
            
            // Display recent formats for the active tab
            displayRecentFormats("from");
            displayRecentFormats("to");
        });
    });

    // Progress bar functions
    function showProgressBar() {
        const progressContainer = document.getElementById("progress-container");
        const progressBar = document.getElementById("progress-bar");
        const progressText = progressBar.querySelector(".progress-text");
        
        progressContainer.style.display = "block";
        progressBar.style.width = "0%";
        progressText.textContent = "0%";
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            // Cap at 90% to show it's not complete until the response comes back
            if (progress < 90) {
                progress += Math.random() * 5;
                if (progress > 90) progress = 90;
                
                progressBar.style.width = progress + "%";
                progressText.textContent = Math.round(progress) + "%";
            }
        }, 200);
        
        return {
            complete: function() {
                clearInterval(interval);
                progressBar.style.width = "100%";
                progressText.textContent = "100%";
                
                // Hide after 1 second
                setTimeout(() => {
                    progressContainer.style.display = "none";
                }, 1000);
            }
        };
    }

    // File input styling
    const fileInput = document.getElementById("file-input");
    const fileName = document.getElementById("file-name");

    fileInput.addEventListener("change", function () {
        const name = this.files[0]?.name || "No file selected";
        fileName.textContent = name;
    });

    // File form submission
    const fileForm = document.getElementById("file-form");
    fileForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const fileInput = document.getElementById("file-input");
        const fromFormat = document.getElementById("file-from-format").value;
        const toFormat = document.getElementById("file-to-format").value;
        const options = document.getElementById("file-options").value;

        // Validate inputs
        if (!fileInput.files[0]) {
            showResult("Please select a file.", true);
            return;
        }
        if (!fromFormat) {
            showResult("Please specify the source format.", true);
            return;
        }
        if (!toFormat) {
            showResult("Please specify the target format.", true);
            return;
        }

        // Add to recent formats
        addRecentFormat("from", fromFormat);
        addRecentFormat("to", toFormat);

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        formData.append("conversion_type", "file");
        formData.append("from_format", fromFormat);
        formData.append("to_format", toFormat);

        if (options) {
            formData.append("options", options);
        }

        try {
            showResult(`<div class="loading"><i class="fas fa-spinner fa-spin"></i> Converting your file...</div>`, false);
            
            // Show progress bar
            const progress = showProgressBar();
            
            const response = await fetch("/convert", {
                method: "POST",
                body: formData,
                // Don't set Content-Type header, let the browser set it with the boundary parameter
            });
            
            // Complete progress bar
            progress.complete();
            
            const result = await response.json();

            if (response.ok) {
                // Save to conversion history
                saveConversionToHistory(fromFormat, toFormat, fileInput.files[0].name);
                showResult(formatResult(result), false);
            } else {
                showResult(`<div class="error"><i class="fas fa-exclamation-circle"></i> <strong>Error:</strong> ${result.error || 'Unknown error'}</div>`, false);
            }
        } catch (error) {
            console.error("Conversion error:", error);
            showResult(`<div class="error"><i class="fas fa-exclamation-circle"></i> <strong>Error:</strong> ${error.message}</div>`, false);
        }
    });

    // Text form submission with similar updates for progress bar and history
    const textForm = document.getElementById("text-form");
    textForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const content = document.getElementById("text-content").value;
        const fromFormat = document.getElementById("text-from-format").value;
        const toFormat = document.getElementById("text-to-format").value;
        const options = document.getElementById("text-options").value;

        // Validate inputs
        if (!content) {
            showResult("Please enter text content.", true);
            return;
        }
        if (!fromFormat) {
            showResult("Please specify the source format.", true);
            return;
        }
        if (!toFormat) {
            showResult("Please specify the target format.", true);
            return;
        }

        // Add to recent formats
        addRecentFormat("from", fromFormat);
        addRecentFormat("to", toFormat);

        const requestData = {
            text: content,
            from_format: fromFormat,
            to_format: toFormat,
            conversion_type: 'text'
        };

        if (options) {
            requestData.options = options;
        }

        try {
            showResult(`<div class="loading"><i class="fas fa-spinner fa-spin"></i> Converting your text...</div>`, false);
            
            // Show progress bar
            const progress = showProgressBar();
            
            const response = await fetch("/convert", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData)
            });
            
            // Complete progress bar
            progress.complete();
            
            const result = await response.json();

            if (response.ok) {
                // Save to conversion history
                saveConversionToHistory(fromFormat, toFormat, "Text conversion");
                showResult(formatResult(result), false);
            } else {
                showResult(`<div class="error"><i class="fas fa-exclamation-circle"></i> <strong>Error:</strong> ${result.error || 'Unknown error'}</div>`, false);
            }
        } catch (error) {
            console.error("Conversion error:", error);
            showResult(`<div class="error"><i class="fas fa-exclamation-circle"></i> <strong>Error:</strong> ${error.message}</div>`, false);
        }
    });

    // Base64 form submission with similar updates for progress bar and history
    const base64Form = document.getElementById("base64-form");
    base64Form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const base64Input = document.getElementById("base64-input").value;
        const fromFormat = document.getElementById("base64-from-format").value;
        const toFormat = document.getElementById("base64-to-format").value;
        const options = document.getElementById("base64-options").value;

        // Validate inputs
        if (!base64Input) {
            showResult("Please enter base64 content.", true);
            return;
        }
        if (!fromFormat) {
            showResult("Please specify the source format.", true);
            return;
        }
        if (!toFormat) {
            showResult("Please specify the target format.", true);
            return;
        }

        // Add to recent formats
        addRecentFormat("from", fromFormat);
        addRecentFormat("to", toFormat);

        const requestData = {
            base64_data: base64Input,
            from_format: fromFormat,
            to_format: toFormat,
            conversion_type: 'base64'
        };

        if (options) {
            requestData.options = options;
        }

        try {
            showResult(`<div class="loading"><i class="fas fa-spinner fa-spin"></i> Converting your data...</div>`, false);
            
            // Show progress bar
            const progress = showProgressBar();
            
            const response = await fetch("/convert", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData)
            });
            
            // Complete progress bar
            progress.complete();
            
            const result = await response.json();

            if (response.ok) {
                // Save to conversion history
                saveConversionToHistory(fromFormat, toFormat, "Base64 conversion");
                showResult(formatResult(result), false);
            } else {
                showResult(`<div class="error"><i class="fas fa-exclamation-circle"></i> <strong>Error:</strong> ${result.error || 'Unknown error'}</div>`, false);
            }
        } catch (error) {
            console.error("Conversion error:", error);
            showResult(`<div class="error"><i class="fas fa-exclamation-circle"></i> <strong>Error:</strong> ${error.message}</div>`, false);
        }
    });

    // Function to display result
    function showResult(message, isError) {
        const resultElement = document.getElementById("result");
        resultElement.innerHTML = message;
        
        // Scroll to result
        resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Function to format result
    function formatResult(result) {
        if (result.success) {
            if (result.downloadUrl) {
                let content = "";
                if (result.content && result.content.length > 0) {
                    if (result.content === "[Binary content - download to view]") {
                        content = `<div class="content-result">
                            <p><i class="fas fa-file-alt"></i> ${result.content}</p>
                        </div>`;
                    } else {
                        content = `<div class="content-result">
                            <h3><i class="fas fa-file-alt"></i> Document Content Preview:</h3>
                            <div class="content-preview">${escapeHTML(result.content)}</div>
                        </div>`;
                    }
                }
                
                return `<div class="conversion-success">
                    <h3><i class="fas fa-check-circle"></i> Conversion Successful!</h3>
                    <div class="conversion-details">
                        <p><strong><i class="fas fa-file-import"></i> From:</strong> ${escapeHTML(document.querySelector('.tab-pane.active [id$="-from-format"]').value)}</p>
                        <p><strong><i class="fas fa-file-export"></i> To:</strong> ${escapeHTML(document.querySelector('.tab-pane.active [id$="-to-format"]').value)}</p>
                        <p><strong><i class="fas fa-file"></i> Filename:</strong> ${escapeHTML(result.downloadUrl.split('/').pop())}</p>
                    </div>
                    ${content}
                    <div class="download-button-container">
                        <a href="${result.downloadUrl}" class="download-btn">
                            <i class="fas fa-download"></i> Download Converted File
                        </a>
                    </div>
                </div>`;
            }
                const content = result.content || result.result;
                const activeTab = document.querySelector('.tab-pane.active');
                let fromFormat = document.querySelector('.tab-pane.active [id$="-from-format"]').value;
                let toFormat = document.querySelector('.tab-pane.active [id$="-to-format"]').value;
                
                return `<div class="conversion-success">
                    <h3><i class="fas fa-check-circle"></i> Conversion Successful!</h3>
                    <div class="conversion-details">
                        <p><strong><i class="fas fa-file-import"></i> From:</strong> ${escapeHTML(fromFormat)}</p>
                        <p><strong><i class="fas fa-file-export"></i> To:</strong> ${escapeHTML(toFormat)}</p>
                    </div>
                    <div class="content-result">
                        <h3><i class="fas fa-file-alt"></i> Converted Content:</h3>
                        <pre>${escapeHTML(content)}</pre>
                    </div>
                </div>`;
            }
        return `<div class="error">
            <p><strong><i class="fas fa-exclamation-circle"></i> Conversion failed:</strong> ${result.error || 'Unknown error'}</p>
        </div>`;
    }

    // Helper function to escape HTML
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Base64 file uploader helper - drag and drop
    const base64Drop = document.getElementById("base64-tab");
    
    base64Drop.addEventListener("dragover", function (e) {
        e.preventDefault();
        this.classList.add("drag-over");
    });

    base64Drop.addEventListener("dragleave", function (e) {
        e.preventDefault();
        this.classList.remove("drag-over");
    });

    base64Drop.addEventListener("drop", function (e) {
        e.preventDefault();
        this.classList.remove("drag-over");

        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (evt) {
                document.getElementById("base64-input").value = evt.target.result;
                showResult(`<div class="success"><i class="fas fa-check-circle"></i> File loaded as base64. Click Convert to process it.</div>`, false);
            };
            reader.readAsDataURL(file);
        }
    });

    // Add format examples
    const formatHelp = document.querySelectorAll("[id$='-from-format'], [id$='-to-format']");
    formatHelp.forEach(input => {
        input.addEventListener("focus", function() {
            if (!this.getAttribute("data-tip-shown")) {
                showResult(`<div class="info"><i class="fas fa-info-circle"></i> <strong>Format tip:</strong> Type or select a format from the dropdown list. Common formats include: markdown, html, docx, pdf, latex, odt</div>`, false);
                this.setAttribute("data-tip-shown", "true");
            }
        });
    });

    // Handle help icons click
    const helpIcons = document.querySelectorAll(".options-help i");
    helpIcons.forEach(icon => {
        icon.addEventListener("click", function(e) {
            e.stopPropagation();
            const tooltip = this.nextElementSibling;
            
            // Close all other tooltips
            document.querySelectorAll(".options-tooltip").forEach(tip => {
                if (tip !== tooltip) {
                    tip.style.display = "none";
                }
            });
            
            // Toggle current tooltip
            if (tooltip.style.display === "block") {
                tooltip.style.display = "none";
            } else {
                tooltip.style.display = "block";
            }
        });
    });
    
    // Close tooltips when clicking elsewhere
    document.addEventListener("click", function() {
        document.querySelectorAll(".options-tooltip").forEach(tooltip => {
            tooltip.style.display = "none";
        });
    });

    // Handle drag and drop for the file input
    const fileDropArea = document.querySelector(".file-upload-label");
    
    fileDropArea.addEventListener("dragover", function(e) {
        e.preventDefault();
        this.classList.add("active");
    });
    
    fileDropArea.addEventListener("dragleave", function() {
        this.classList.remove("active");
    });
    
    fileDropArea.addEventListener("drop", function(e) {
        e.preventDefault();
        this.classList.remove("active");
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    });

    // Helper functions
    function selectOptionByValue(selectElement, value) {
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === value) {
                selectElement.selectedIndex = i;
                return true;
            }
        }
        return false;
    }

    function initializeSelectedOptions(inputId, containerId) {
        const input = document.getElementById(inputId);
        const container = document.getElementById(containerId);
        
        if (input && container) {
            // Parse initial options
            input.addEventListener('input', () => {
                updateSelectedOptions(input, container);
            });
            
            // Initial update
            updateSelectedOptions(input, container);
        }
    }

    function updateSelectedOptions(input, container) {
        container.innerHTML = '';
        
        const options = input.value.trim();
        if (options === '') return;
        
        const optionList = options.split(' ').filter(opt => opt.trim() !== '');
        
        optionList.forEach(option => {
            addOptionTag(option, container, input);
        });
    }

    function addOptionTag(option, container, inputElement) {
        // Check if the option already exists
        const existingOption = Array.from(container.children).find(child => 
            child.getAttribute('data-option') === option
        );
        
        if (existingOption) return;
        
        const tag = document.createElement('div');
        tag.className = 'option-tag';
        tag.setAttribute('data-option', option);
        
        const text = document.createElement('span');
        text.textContent = option;
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-option';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            tag.remove();
            updateInputFromTags(container, inputElement);
        });
        
        tag.appendChild(text);
        tag.appendChild(removeBtn);
        container.appendChild(tag);
    }

    function updateInputFromTags(container, inputElement) {
        const tags = Array.from(container.children);
        const options = tags.map(tag => tag.getAttribute('data-option')).join(' ');
        inputElement.value = options;
    }

    // Predefined conversion options for each type
    const conversionOptions = {
        file: [
            "pdf-to-docx", "docx-to-pdf", "html-to-pdf", "md-to-pdf", "md-to-html",
            "xlsx-to-pdf", "pdf-to-txt", "image-to-pdf", "image-to-text", "compress-pdf"
        ],
        text: [
            "text-to-html", "html-to-text", "text-to-md", "md-to-text", 
            "json-to-yaml", "yaml-to-json", "csv-to-json", "json-to-csv"
        ],
        base64: [
            "base64-to-text", "text-to-base64", "base64-to-image", "image-to-base64",
            "base64-to-pdf", "pdf-to-base64"
        ]
    };

    // File preview supported types
    const previewSupportedTypes = {
        'application/pdf': 'pdf',
        'image/jpeg': 'image',
        'image/png': 'image',
        'image/gif': 'image',
        'image/webp': 'image',
        'image/svg+xml': 'image',
        'text/plain': 'text',
        'text/html': 'html',
        'text/markdown': 'text',
        'application/json': 'text',
        'text/csv': 'text',
        'application/xml': 'text',
        'text/xml': 'text'
    };

    // Global variables
    let currentFile = null;
    let currentPreviewUrl = null;

    // Initialize the application
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize tabs
        document.querySelectorAll('.nav-link').forEach(tab => {
            tab.addEventListener('click', function(event) {
                event.preventDefault();
                
                // Remove active class from all tabs and tab contents
                document.querySelectorAll('.nav-link').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active', 'show'));
                
                // Add active class to current tab and tab content
                this.classList.add('active');
                const target = this.getAttribute('href').substring(1);
                document.getElementById(target).classList.add('active', 'show');
            });
        });

        // Initialize file tab
        const fileInput = document.getElementById('file-input');
        const fileForm = document.getElementById('file-form');
        const fileUploadContainer = document.querySelector('.file-upload-container');
        const fileNameDisplay = document.getElementById('file-name');
        const previewFileBtn = document.getElementById('preview-file-btn');
        
        fileInput.addEventListener('change', function(event) {
            if (this.files && this.files[0]) {
                currentFile = this.files[0];
                fileNameDisplay.textContent = currentFile.name;
                fileUploadContainer.classList.add('has-file');

                // Show preview button if file type is supported
                if (isPreviewable(currentFile.type)) {
                    previewFileBtn.style.display = 'inline-flex';
                    // Create preview URL
                    if (currentPreviewUrl) {
                        URL.revokeObjectURL(currentPreviewUrl);
                    }
                    currentPreviewUrl = URL.createObjectURL(currentFile);
                } else {
                    previewFileBtn.style.display = 'none';
                }
            } else {
                fileNameDisplay.textContent = 'No file chosen';
                fileUploadContainer.classList.remove('has-file');
                previewFileBtn.style.display = 'none';
            }
        });

        // Preview button click handler
        previewFileBtn.addEventListener('click', function() {
            if (currentFile && currentPreviewUrl) {
                showFilePreview(currentFile, currentPreviewUrl);
            }
        });

        // Initialize text tab
        const textForm = document.getElementById('text-form');
        
        // Initialize base64 tab
        const base64Form = document.getElementById('base64-form');

        // Initialize conversion options selects
        const fileOptionsSelect = document.getElementById('file-options-select');
        const textOptionsSelect = document.getElementById('text-options-select');
        const base64OptionsSelect = document.getElementById('base64-options-select');

        // Populate options
        populateOptions(fileOptionsSelect, conversionOptions.file);
        populateOptions(textOptionsSelect, conversionOptions.text);
        populateOptions(base64OptionsSelect, conversionOptions.base64);

        // Initialize form submissions
        fileForm.addEventListener('submit', handleFormSubmit);
        textForm.addEventListener('submit', handleFormSubmit);
        base64Form.addEventListener('submit', handleFormSubmit);

        // Initialize conversion history
        displayConversionHistory();
        
        // Initialize history buttons
        document.getElementById('clear-history-btn').addEventListener('click', clearConversionHistory);
        document.getElementById('download-all-history-btn').addEventListener('click', downloadAllHistory);

        // Initialize modal close buttons
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', function() {
                const modalId = this.getAttribute('data-modal');
                document.getElementById(modalId).style.display = 'none';
            });
        });

        // Close modals when clicking outside content
        document.querySelectorAll('.preview-modal').forEach(modal => {
            modal.addEventListener('click', function(event) {
                if (event.target === this) {
                    this.style.display = 'none';
                }
            });
        });
    });

    // Check if a file type is previewable
    function isPreviewable(fileType) {
        return previewSupportedTypes.hasOwnProperty(fileType);
    }

    // Populate options select
    function populateOptions(selectElement, options) {
        options.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option.replace(/-/g, ' → ');
            selectElement.appendChild(optElement);
        });
    }

    // Show file preview modal
    function showFilePreview(file, url) {
        const filePreviewModal = document.getElementById('file-preview-modal');
        const modalTitle = filePreviewModal.querySelector('.modal-title');
        const previewContent = document.getElementById('file-preview-content');
        
        modalTitle.textContent = file.name;
        previewContent.innerHTML = '';
        
        const fileType = previewSupportedTypes[file.type];
        
        if (fileType === 'pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = url;
            previewContent.appendChild(iframe);
        } else if (fileType === 'image') {
            const img = document.createElement('img');
            img.src = url;
            img.alt = file.name;
            previewContent.appendChild(img);
        } else if (fileType === 'text' || fileType === 'html') {
            const reader = new FileReader();
            reader.onload = function(e) {
                const div = document.createElement('div');
                div.className = 'text-preview';
                
                if (fileType === 'html') {
                    div.innerHTML = e.target.result;
                } else {
                    div.textContent = e.target.result;
                }
                
                previewContent.appendChild(div);
            };
            reader.readAsText(file);
        }
        
        filePreviewModal.style.display = 'flex';
    }

    // Show content preview modal
    function showContentPreview(content, title) {
        const contentPreviewModal = document.getElementById('content-preview-modal');
        const modalTitle = contentPreviewModal.querySelector('.modal-title');
        const previewContainer = document.getElementById('content-preview-container');
        
        modalTitle.textContent = title || 'Content Preview';
        previewContainer.textContent = content;
        
        contentPreviewModal.style.display = 'flex';
    }

    // Handle form submission
    function handleFormSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const formType = form.getAttribute('id').split('-')[0]; // 'file', 'text', or 'base64'
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner"></i> Converting...';
        
        // Get form data
        const formData = new FormData(form);
        
        // Add conversion type
        if (formType === 'file') {
            const selectedOptions = document.getElementById('file-options-select').selectedOptions;
            if (selectedOptions.length > 0) {
                formData.set('conversion_option', selectedOptions[0].value);
            }
        } else if (formType === 'text') {
            const selectedOptions = document.getElementById('text-options-select').selectedOptions;
            if (selectedOptions.length > 0) {
                formData.set('conversion_option', selectedOptions[0].value);
            }
        } else if (formType === 'base64') {
            const selectedOptions = document.getElementById('base64-options-select').selectedOptions;
            if (selectedOptions.length > 0) {
                formData.set('conversion_option', selectedOptions[0].value);
            }
        }
        
        // Send request
        fetch(`/api/${formType}/convert`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Handle successful conversion
            displayResult(data, formType);
            saveToHistory(data, formType);
            
            // Reset the form if successful
            if (data.status === 'success') {
                if (formType === 'file') {
                    document.getElementById('file-name').textContent = 'No file chosen';
                    document.querySelector('.file-upload-container').classList.remove('has-file');
                    document.getElementById('preview-file-btn').style.display = 'none';
                    if (currentPreviewUrl) {
                        URL.revokeObjectURL(currentPreviewUrl);
                        currentPreviewUrl = null;
                    }
                    currentFile = null;
                }
                form.reset();
            }
            
            // Show toast notification
            showToast(data.status === 'success' ? 'Conversion successful!' : 'Conversion failed: ' + data.message, 
                     data.status === 'success' ? 'success' : 'error');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error: ' + error.message, 'error');
        })
        .finally(() => {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        });
    }

    // Display conversion result
    function displayResult(data, type) {
        const resultContainer = document.getElementById(`${type}-result-container`);
        const resultContent = document.getElementById(`${type}-result-content`);
        
        resultContainer.style.display = 'block';
        
        if (data.status === 'success') {
            if (data.download_url) {
                // If the result is a file, show download link
                resultContent.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i> Conversion successful!
                    </div>
                    <p>Your file is ready to download:</p>
                    <a href="${data.download_url}" class="btn btn-primary" download>
                        <i class="fas fa-download"></i> Download Converted File
                    </a>
                `;
            } else if (data.content) {
                // If the result is text content, show it and add a preview button
                const truncatedContent = data.content.length > 200 ? 
                    data.content.substring(0, 200) + '...' : data.content;
                
                resultContent.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i> Conversion successful!
                    </div>
                    <div class="content-preview">
                        <pre>${truncatedContent}</pre>
                        <div class="content-preview-overlay">
                            <button class="view-full-content-btn">View Full Content</button>
                        </div>
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-sm btn-info copy-content-btn">
                            <i class="fas fa-copy"></i> Copy to Clipboard
                        </button>
                        <button class="btn btn-sm btn-secondary preview-content-btn">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                    </div>
                `;
                
                // Add event listeners
                resultContent.querySelector('.view-full-content-btn').addEventListener('click', function() {
                    const previewDiv = resultContent.querySelector('.content-preview');
                    previewDiv.classList.toggle('full');
                    this.textContent = previewDiv.classList.contains('full') ? 
                        'Show Less' : 'View Full Content';
                    this.parentElement.style.display = previewDiv.classList.contains('full') ? 
                        'none' : 'flex';
                });
                
                resultContent.querySelector('.copy-content-btn').addEventListener('click', function() {
                    navigator.clipboard.writeText(data.content)
                        .then(() => showToast('Content copied to clipboard!', 'success'))
                        .catch(err => showToast('Failed to copy: ' + err, 'error'));
                });
                
                resultContent.querySelector('.preview-content-btn').addEventListener('click', function() {
                    showContentPreview(data.content, 'Converted Content');
                });
            } else {
                // Fallback for unexpected response format
                resultContent.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i> Conversion successful!
                    </div>
                    <p>No preview available for this conversion type.</p>
                `;
            }
        } else {
            // Error case
            resultContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Conversion failed!
                </div>
                <p>Error: ${data.message}</p>
            `;
        }
    }

    // Toast notification
    function showToast(message, type = 'success') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Set icon based on type
        let icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'info') icon = 'info-circle';
        
        toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Remove after animation
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Save conversion result to history
    function saveToHistory(data, type) {
        if (data.status !== 'success') return;
        
        // Get current history or initialize empty array
        let history = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
        
        // Add new entry
        const historyItem = {
            timestamp: new Date().toISOString(),
            type: type,
            option: data.conversion_option,
            download_url: data.download_url || null,
            content: data.content || null,
            filename: data.filename || null
        };
        
        // Add to beginning of array (newest first)
        history.unshift(historyItem);
        
        // Limit history size
        if (history.length > 20) {
            history = history.slice(0, 20);
        }
        
        // Save back to localStorage
        localStorage.setItem('conversionHistory', JSON.stringify(history));
        
        // Update display
        displayConversionHistory();
    }

    // Display conversion history
    function displayConversionHistory() {
        const historyContainer = document.getElementById('conversion-history-container');
        const history = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<p class="text-center text-muted py-4">No conversion history yet.</p>';
            document.getElementById('clear-history-btn').style.display = 'none';
            document.getElementById('download-all-history-btn').style.display = 'none';
            return;
        }
        
        // Show clear button if we have history
        document.getElementById('clear-history-btn').style.display = 'block';
        document.getElementById('download-all-history-btn').style.display = 'block';
        
        // Create history items
        let html = '';
        
        history.forEach((item, index) => {
            const date = new Date(item.timestamp);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            let itemContent = '';
            if (item.download_url) {
                itemContent = `
                    <a href="${item.download_url}" class="btn btn-sm btn-primary" download>
                        <i class="fas fa-download"></i> Download
                    </a>
                `;
            } else if (item.content) {
                const truncatedContent = item.content.length > 30 ? 
                    item.content.substring(0, 30) + '...' : item.content;
                
                itemContent = `
                    <p class="mb-1 text-muted small">${truncatedContent}</p>
                    <button class="btn btn-sm btn-info history-preview-btn" data-index="${index}">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                `;
            }
            
            html += `
                <div class="history-item p-3 mb-3 border rounded">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${item.option.replace(/-/g, ' → ')}</h6>
                            <p class="text-muted small mb-2">${formattedDate}</p>
                        </div>
                        <div class="history-item-actions">
                            <button class="btn btn-sm btn-danger delete-history-btn" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mt-2">
                        ${itemContent}
                    </div>
                </div>
            `;
        });
        
        historyContainer.innerHTML = html;
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-history-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removeHistoryItem(index);
            });
        });
        
        // Add event listeners to preview buttons
        document.querySelectorAll('.history-preview-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const history = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
                const item = history[index];
                
                if (item && item.content) {
                    showContentPreview(item.content, `${item.option.replace(/-/g, ' → ')} Result`);
                }
            });
        });
    }

    // Remove a history item
    function removeHistoryItem(index) {
        let history = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
        
        if (index >= 0 && index < history.length) {
            history.splice(index, 1);
            localStorage.setItem('conversionHistory', JSON.stringify(history));
            displayConversionHistory();
            showToast('History item removed', 'info');
        }
    }

    // Clear all conversion history
    function clearConversionHistory() {
        if (confirm('Are you sure you want to clear all conversion history?')) {
            localStorage.removeItem('conversionHistory');
            displayConversionHistory();
            showToast('Conversion history cleared', 'info');
        }
    }

    // Download all conversion history
    function downloadAllHistory() {
        const history = JSON.parse(localStorage.getItem('conversionHistory') || '[]');
        
        if (history.length === 0) {
            showToast('No conversion history to download', 'error');
            return;
        }
        
        // Show loading state
        const downloadBtn = document.getElementById('download-all-history-btn');
        const originalBtnText = downloadBtn.innerHTML;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fas fa-spinner"></i> Processing...';
        
        // Send the history to the API endpoint
        fetch('/api/history/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ history: history })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'conversion_history.zip';
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            showToast('History downloaded successfully', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error downloading history: ' + error.message, 'error');
        })
        .finally(() => {
            // Reset button state
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalBtnText;
        });
    }
});
