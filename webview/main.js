// Script inside the webview
(function() {
    const vscode = acquireVsCodeApi();
    const titleInput = document.getElementById('title');
    const categoriesInput = document.getElementById('categories');
    const tagsInput = document.getElementById('tags');
    const layoutSelect = document.getElementById('layout');
    const createBtn = document.getElementById('createBtn');
    const addOptionBtn = document.getElementById('addOptionBtn');
    const customFieldsContainer = document.getElementById('customFieldsContainer');
    const emptyState = document.getElementById('emptyState');
    const previewContent = document.getElementById('previewContent');
    const togglePreviewBtn = document.getElementById('togglePreviewBtn');

    const previewCard = document.getElementById('previewCard');

    let customFieldIndex = 0;
    let previewVisible = false;

    // --- Live Preview ---
    function updatePreview() {
        const title = titleInput.value.trim();
        const categories = categoriesInput.value.trim();
        const tags = tagsInput.value.trim();
        const layout = layoutSelect.value;

        let lines = [
            '---',
            'layout: ' + layout,
            'title: "' + (title || '') + '"',
            'date: <span class="preview-placeholder">auto-generated</span>'
        ];

        if (categories) {
            const cats = categories.split(/\s+/).filter(Boolean);
            lines.push('categories: ["' + cats.join('","') + '"]');
        }
        if (tags) {
            const tagList = tags.split(/\s+/).filter(Boolean);
            lines.push('tags: ["' + tagList.join('","') + '"]');
        }

        // Custom fields
        const fields = customFieldsContainer.querySelectorAll('.custom-field');
        fields.forEach(function(field) {
            const key = field.querySelector('input[data-type="key"]').value.trim();
            const value = field.querySelector('input[data-type="value"]').value.trim();
            if (key) {
                lines.push(key + ': ' + (value || '""'));
            }
        });

        lines.push('---');
        previewContent.innerHTML = lines.join('\n');
    }

    // Attach live preview listeners to static inputs
    [titleInput, categoriesInput, tagsInput, layoutSelect].forEach(function(el) {
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
    });

    // Toggle floating preview panel
    togglePreviewBtn.addEventListener('click', function() {
        previewVisible = !previewVisible;
        previewCard.classList.toggle('open', previewVisible);
        togglePreviewBtn.textContent = previewVisible ? 'Close' : 'Preview';
    });

    // --- Empty State ---
    function updateEmptyState() {
        var hasFields = customFieldsContainer.querySelectorAll('.custom-field').length > 0;
        emptyState.classList.toggle('hidden', hasFields);
    }

    // --- Custom Fields ---
    function addCustomField() {
        const fieldId = customFieldIndex++;
        const div = document.createElement('div');
        div.className = 'custom-field';
        div.dataset.id = fieldId;

        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'Key (e.g. comments)';
        keyInput.dataset.type = 'key';
        keyInput.oninput = function() {
            keyInput.classList.remove('error');
            updatePreview();
        };
        keyInput.onfocus = function() { keyInput.classList.remove('error'); };

        const separator = document.createElement('span');
        separator.className = 'field-separator';
        separator.textContent = ':';

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.placeholder = 'Value (e.g. true, 123, "text")';
        valueInput.dataset.type = 'value';
        valueInput.oninput = updatePreview;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '\u00d7';
        removeBtn.title = 'Remove field';
        removeBtn.type = 'button';
        removeBtn.onclick = function() {
            div.style.opacity = '0';
            div.style.transform = 'translateY(-6px)';
            div.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            setTimeout(function() {
                div.remove();
                updateEmptyState();
                updatePreview();
            }, 150);
        };

        div.appendChild(keyInput);
        div.appendChild(separator);
        div.appendChild(valueInput);
        div.appendChild(removeBtn);
        customFieldsContainer.appendChild(div);
        keyInput.focus();
        updateEmptyState();
        updatePreview();
    }

    addOptionBtn.addEventListener('click', addCustomField);

    // --- Create Post ---
    createBtn.addEventListener('click', function() {
        // Reset previous errors
        titleInput.classList.remove('error');
        document.querySelectorAll('#customFieldsContainer .custom-field input[data-type="key"]').forEach(function(el) {
            el.classList.remove('error');
        });

        const title = titleInput.value.trim();
        if (!title) {
            vscode.postMessage({ command: 'error', text: 'Title is required.' });
            titleInput.classList.add('error');
            titleInput.focus();
            return;
        }

        // Collect custom fields
        const additionalOptions = {};
        const customFields = customFieldsContainer.querySelectorAll('.custom-field');
        let hasError = false;
        customFields.forEach(function(field) {
            const keyInput = field.querySelector('input[data-type="key"]');
            const valueInput = field.querySelector('input[data-type="value"]');
            const key = keyInput.value.trim();
            const value = valueInput.value.trim();

            if (key) {
                try {
                    if (value === 'true') { additionalOptions[key] = true; }
                    else if (value === 'false') { additionalOptions[key] = false; }
                    else if (value === 'null') { additionalOptions[key] = null; }
                    else if (value !== '' && !isNaN(Number(value)) && isFinite(Number(value))) { additionalOptions[key] = Number(value); }
                    else if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
                        additionalOptions[key] = JSON.parse(value);
                    }
                    else { additionalOptions[key] = value; }
                } catch (e) {
                    additionalOptions[key] = value; // Treat as string if parse fails
                }
            } else if (value) {
                vscode.postMessage({ command: 'error', text: 'Custom field key cannot be empty if value "' + value + '" is provided.' });
                keyInput.classList.add('error');
                hasError = true;
            }
        });

        if (hasError) return;

        vscode.postMessage({
            command: 'createPost',
            data: {
                title: title,
                categories: categoriesInput.value,
                tags: tagsInput.value,
                layout: layoutSelect.value,
                additionalOptions: additionalOptions
            }
        });
    });

    // Initialize
    updatePreview();
    updateEmptyState();

}()); // End of IIFE wrapper for script
