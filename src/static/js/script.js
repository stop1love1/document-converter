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
        btn.addEventListener("click", function() {
            const fromFormat = this.getAttribute("data-from");
            const toFormat = this.getAttribute("data-to");
            
            document.getElementById("file-from-format").value = fromFormat;
            document.getElementById("file-to-format").value = toFormat;
        });
    });
    
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
                    inputField.value = format;
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
        const history = JSON.parse(localStorage.getItem("conversion_history") || "[]");
        const historyList = document.getElementById("history-list");
        
        historyList.innerHTML = '';
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="empty-history">No conversion history yet.</div>';
            return;
        }
        
        history.forEach(item => {
            const historyItem = document.createElement("div");
            historyItem.className = "history-item";
            historyItem.dataset.id = item.id;
            
            const date = new Date(item.date);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            historyItem.innerHTML = `
                <div class="history-item-info">
                    <span class="history-item-formats">${item.from} → ${item.to}</span>
                    <span class="history-item-name">${item.name}</span>
                    <span class="history-item-date">${formattedDate}</span>
                </div>
                <div class="history-actions">
                    <button class="history-action-btn reuse-btn" title="Reuse these formats"><i class="fas fa-sync"></i></button>
                    <button class="history-action-btn delete-btn" title="Delete from history"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            historyList.appendChild(historyItem);
            
            // Add event listeners for history item buttons
            historyItem.querySelector(".reuse-btn").addEventListener("click", function() {
                // Get the active tab and set the formats
                const activeTab = document.querySelector('.tab-pane.active');
                const tabId = activeTab.id;
                
                document.getElementById(`${tabId.split('-')[0]}-from-format`).value = item.from;
                document.getElementById(`${tabId.split('-')[0]}-to-format`).value = item.to;
            });
            
            historyItem.querySelector(".delete-btn").addEventListener("click", function() {
                deleteHistoryItem(item.id);
            });
        });
    }
    
    function deleteHistoryItem(id) {
        let history = JSON.parse(localStorage.getItem("conversion_history") || "[]");
        history = history.filter(item => item.id !== id);
        localStorage.setItem("conversion_history", JSON.stringify(history));
        
        // Update UI
        displayConversionHistory();
    }
    
    // Clear history button
    document.getElementById("clear-history").addEventListener("click", function() {
        if (confirm("Are you sure you want to clear your conversion history?")) {
            localStorage.removeItem("conversion_history");
            displayConversionHistory();
        }
    });
    
    // Initialize history display
    displayConversionHistory();
    
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
});
