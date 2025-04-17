// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA8TUkmdL1s_-qc_qcnZeO7mN0kz0qONCE",
    authDomain: "rxplain.firebaseapp.com",
    projectId: "rxplain",
    storageBucket: "rxplain.firebasestorage.app",
    messagingSenderId: "122430450099",
    appId: "1:122430450099:web:be5bf161c2dc49685a43c6",
    measurementId: "G-069YDW1QQK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore and Auth
const db = firebase.firestore();
const auth = firebase.auth();

// DOM elements
const fileInput = document.getElementById('file-input');
const browseButton = document.getElementById('browse-button');
const uploadContainer = document.getElementById('upload-container');
const errorMessage = document.getElementById('error-message');
const uploadProgress = document.getElementById('upload-progress');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const documentList = document.getElementById('document-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const navLoadingIndicator = document.querySelector('.nav-loading');
const createReportBtn = document.getElementById('create-report-btn');
const selectedCountDisplay = document.getElementById('selected-count');

// Keep track of selected documents
let selectedDocuments = new Set();

// Hide loading indicator if it exists
if (navLoadingIndicator) {
    navLoadingIndicator.style.display = 'none';
}

// Supported file types and max size (10MB)
const supportedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes

// Check if user is authenticated
auth.onAuthStateChanged(async function(user) {
    // Show loading indicator
    if (navLoadingIndicator) {
        navLoadingIndicator.style.display = 'inline-block';
    }

    if (user) {
        try {
            // Get the ID token
            const idToken = await user.getIdToken();
            
            // Create a session
            const response = await fetch('/api/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken })
            });

            if (!response.ok) {
                throw new Error('Failed to create session');
            }

            // User is signed in and has a valid session, load their documents
            loadDocuments();
        } catch (error) {
            console.error('Session creation failed:', error);
            // Redirect to login if session creation fails
            window.location.href = '/login';
        }
    } else {
        // User is signed out, redirect to login
        window.location.href = '/login';
    }

    // Hide loading indicator
    if (navLoadingIndicator) {
        navLoadingIndicator.style.display = 'none';
    }
});

// Load user documents from server
async function loadDocuments() {
    try {
        // Show loading state
        documentList.innerHTML = '<div class="text-center py-4"><p class="text-gray-500">Loading documents...</p></div>';
        documentList.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        // Get user's documents from the server
        const response = await fetch('/api/documents/user-documents');
        if (!response.ok) {
            throw new Error('Failed to fetch documents');
        }
        
        const data = await response.json();
        
        if (!data.documents || data.documents.length === 0) {
            showEmptyState();
            return;
        }
        
        // Clear document list
        documentList.innerHTML = '';
        
        // Add each document to the list
        data.documents.forEach(documentData => {
            addDocumentToList(documentData);
        });
        
        // Show document list
        documentList.classList.remove('hidden');
        emptyState.classList.add('hidden');
    } catch (error) {
        console.error('Error loading documents:', error);
        showError('Error loading documents. Please try again later.');
        showEmptyState();
    }
}

// Show empty state
function showEmptyState() {
    documentList.classList.add('hidden');
    emptyState.classList.remove('hidden');
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Add document to the list
function addDocumentToList(documentData) {
    // Create document item
    const documentItem = document.createElement('div');
    documentItem.className = 'bg-white p-4 rounded-lg shadow mb-4 animate-fade-in';
    documentItem.dataset.id = documentData.id;
    documentItem.dataset.type = documentData.documentType || 'UNCLASSIFIED';
    
    // Format file size
    const fileSize = formatFileSize(documentData.fileSize);
    
    // Format creation date
    const createdDate = new Date(documentData.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // Set icon based on file type
    let fileIcon;
    if (documentData.fileType.includes('pdf')) {
        fileIcon = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8"></path><path d="M16 17H8"></path><polyline points="10 9 9 9 8 9"></polyline>';
    } else {
        fileIcon = '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>';
    }

    // Set processing status indicator
    let processingStatus = '';
    if (documentData.isProcessed) {
        processingStatus = `
            <span class="inline-flex items-center text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
                <svg class="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Processed
            </span>
        `;
    } else if (documentData.isProcessing) {
        processingStatus = `
            <span class="inline-flex items-center text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800 ml-2">
                <svg class="w-3 h-3 mr-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing
            </span>
        `;
    }

    // Set document type badge
    let documentTypeBadge = '';
    if (documentData.documentType && documentData.documentType !== 'UNCLASSIFIED') {
        let badgeClass = '';
        let badgeText = '';
        
        switch (documentData.documentType) {
            case 'PRESCRIPTION':
                badgeClass = 'bg-green-100 text-green-800';
                badgeText = 'Prescription';
                break;
            case 'LAB_REPORT':
                badgeClass = 'bg-blue-100 text-blue-800';
                badgeText = 'Lab Report';
                break;
            case 'CLINICAL_NOTES':
                badgeClass = 'bg-purple-100 text-purple-800';
                badgeText = 'Clinical Notes';
                break;
            case 'INSURANCE':
                badgeClass = 'bg-yellow-100 text-yellow-800';
                badgeText = 'Insurance';
                break;
            default:
                badgeClass = 'bg-gray-100 text-gray-800';
                badgeText = 'Miscellaneous';
                break;
        }
        
        documentTypeBadge = `
            <span class="inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${badgeClass} ml-2">
                ${badgeText}
            </span>
        `;
    }
    
    // Set document item HTML
    documentItem.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0 mr-2">
                <input type="checkbox" class="select-doc-checkbox h-4 w-4 text-health-600 focus:ring-health-500 border-gray-300 rounded" data-id="${documentData.id}">
            </div>
            <div class="w-10 h-10 mr-4 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    ${fileIcon}
            </svg>
            </div>
            <div class="flex-grow">
                <div class="flex items-center flex-wrap">
                    <h3 class="font-medium text-gray-900">${documentData.fileName}</h3>
                    ${processingStatus}
                    ${documentTypeBadge}
                </div>
                <div class="text-sm text-gray-500 mt-1">
                    ${fileSize} • Uploaded on ${createdDate}
            </div>
        </div>
        <div class="flex space-x-2">
                <button class="view-btn p-2 text-gray-500 hover:text-health-500" data-url="${documentData.fileUrl}" title="View Original">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </button>
                <button class="simplify-btn p-2 text-gray-500 hover:text-blue-500" data-id="${documentData.id}" title="Simplify with AI">
                    <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </button>
                <button class="download-btn p-2 text-gray-500 hover:text-health-500" data-url="${documentData.fileUrl}" data-filename="${documentData.fileName}" title="Download">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
                <button class="delete-btn p-2 text-gray-500 hover:text-red-500" data-id="${documentData.id}" title="Delete">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
            </div>
        </div>
    `;
    
    // Add document item to the list
    documentList.prepend(documentItem);
    
    // Add event listeners for buttons
    const viewBtn = documentItem.querySelector('.view-btn');
    const simplifyBtn = documentItem.querySelector('.simplify-btn');
    const downloadBtn = documentItem.querySelector('.download-btn');
    const deleteBtn = documentItem.querySelector('.delete-btn');
    const checkbox = documentItem.querySelector('.select-doc-checkbox');
    
    viewBtn.addEventListener('click', function() {
        const fileUrl = this.dataset.url;
        window.open(fileUrl, '_blank');
    });
    
    simplifyBtn.addEventListener('click', function() {
        const documentId = this.dataset.id;
        simplifyDocument(documentId);
    });
    
    downloadBtn.addEventListener('click', function() {
        const fileUrl = this.dataset.url;
        const fileName = this.dataset.filename;
        downloadFile(fileUrl, fileName);
    });
    
    deleteBtn.addEventListener('click', function() {
        const documentId = this.dataset.id;
        deleteDocument(documentId, documentItem);
    });
    
    checkbox.addEventListener('change', function() {
        const documentId = this.dataset.id;
        toggleDocumentSelection(documentId, this.checked);
    });
    
    // Check the checkbox if the document is already selected
    if (documentData.isSelected) {
        checkbox.checked = true;
    }
}

// Delete document
async function deleteDocument(documentId, documentItem) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }
    
    try {
        const user = auth.currentUser;
        if (!user) {
            showError('You must be logged in to delete files.');
            return;
        }
        
        // Send delete request to server
        const response = await fetch(`/api/documents/${documentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Remove document item from the list
            documentItem.remove();
            
            // Show empty state if no documents left
            if (documentList.children.length === 0) {
                showEmptyState();
            }
            
            // Show success message
            showError('Document deleted successfully');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete document');
        }
    } catch (error) {
        console.error('Error deleting document:', error);
        showError('Error deleting document. Please try again.');
    }
}

// Download file
function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Handle file upload events
function setupFileUpload() {
    // Open file dialog when browse button is clicked
    browseButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Handle drag and drop
    uploadContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadContainer.classList.add('border-health-500');
    });
    
    uploadContainer.addEventListener('dragleave', function() {
        uploadContainer.classList.remove('border-health-500');
    });
    
    uploadContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadContainer.classList.remove('border-health-500');
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    // Handle file selection
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFile(this.files[0]);
        }
    });
}

// Process the selected file
function handleFile(file) {
    // Reset error message
    errorMessage.classList.add('hidden');
    
    // Validate file type
    if (!supportedTypes.includes(file.type)) {
        showError('Unsupported file format. Please upload a PDF, JPG, or PNG file.');
        return;
    }
    
    // Validate file size
    if (file.size > maxFileSize) {
        showError('File is too large. Maximum file size is 10MB.');
        return;
    }
    
    // Show upload progress
    uploadProgress.classList.remove('hidden');
    
    // Upload file using server-side endpoint
    uploadFile(file);
}

// Upload file to server
function uploadFile(file) {
    const user = auth.currentUser;
    if (!user) {
        showError('You must be logged in to upload files.');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Show progress bar
    uploadProgress.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressPercentage.textContent = '0%';
    
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
            progressPercentage.textContent = Math.round(percentComplete) + '%';
        }
    });
    
    xhr.onload = function() {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            console.log('Upload successful:', response);
            
            // Hide progress bar after a short delay
            setTimeout(function() {
                uploadProgress.classList.add('hidden');
                progressBar.style.width = '0%';
                progressPercentage.textContent = '0%';
                
                // Show success message
                errorMessage.textContent = 'File "' + file.name + '" uploaded successfully!';
                errorMessage.classList.remove('hidden');
                errorMessage.classList.remove('text-red-500');
                errorMessage.classList.add('text-green-500');
                
                // Clear file input
                fileInput.value = '';
                
                // Automatically refresh the document list
                loadDocuments();
                
                // Reset error message after 3 seconds
                setTimeout(function() {
                    errorMessage.classList.add('hidden');
                    errorMessage.classList.remove('text-green-500');
                    errorMessage.classList.add('text-red-500');
                }, 3000);
            }, 500);
        } else {
            console.error('Upload failed:', xhr.status, xhr.statusText);
            
            // Hide progress bar
            uploadProgress.classList.add('hidden');
            progressBar.style.width = '0%';
            progressPercentage.textContent = '0%';
            
            // Show error message
            showError('Upload failed. Please try again.');
        }
    };
    
    xhr.onerror = function() {
        console.error('Upload error:', xhr.statusText);
        
        // Hide progress bar
        uploadProgress.classList.add('hidden');
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
        
        // Show error message
        showError('Upload failed. Please try again.');
    };
    
    xhr.open('POST', '/api/documents/upload', true);
    xhr.send(formData);
}

// Search documents
function setupSearch() {
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const documentItems = documentList.querySelectorAll('div[data-filename]');
        
        let hasVisibleItems = false;
        
        documentItems.forEach(function(item) {
            const fileName = item.dataset.filename;
            if (fileName.includes(searchTerm)) {
                item.style.display = 'flex';
                hasVisibleItems = true;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Show empty state if no documents match the search
        if (!hasVisibleItems && documentItems.length > 0) {
            emptyState.innerHTML = `
                <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No documents match your search.</p>
                <p>Try a different search term.</p>
            `;
            emptyState.classList.remove('hidden');
        } else if (hasVisibleItems) {
            emptyState.classList.add('hidden');
        }
    });
}

// Render markdown content
function renderMarkdown(markdown) {
    if (!markdown) return '<p>No content available</p>';
    
    // Use the Marked.js library to render markdown
    return marked.parse(markdown);
}

// Render medication list
function renderMedicationList(medications) {
    if (!medications || medications.length === 0) {
        return '<p class="text-gray-600">No medications found in this document.</p>';
    }
    
    let html = '<div class="space-y-4">';
    
    medications.forEach(med => {
        html += `
            <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold">${med.name || 'Unnamed Medication'}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    ${med.dosage ? `<p><span class="font-medium">Dosage:</span> ${med.dosage}</p>` : ''}
                    ${med.frequency ? `<p><span class="font-medium">Frequency:</span> ${med.frequency}</p>` : ''}
                    ${med.purpose ? `<p><span class="font-medium">Purpose:</span> ${med.purpose}</p>` : ''}
                </div>
                ${med.instructions ? `<p class="mt-2"><span class="font-medium">Instructions:</span> ${med.instructions}</p>` : ''}
                ${med.warnings ? `<p class="mt-2 text-red-600"><span class="font-medium">Warnings:</span> ${med.warnings}</p>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupFilterUI();
    setupFileUpload();
    setupSearch();
    
    // Initialize selectedDocuments Set from checked checkboxes (if page reloads)
    const checkedBoxes = document.querySelectorAll('.select-doc-checkbox:checked');
    checkedBoxes.forEach(checkbox => {
        if (checkbox.checked && checkbox.dataset.id) {
            selectedDocuments.add(checkbox.dataset.id);
        }
    });
    
    // Initialize button state
    updateSelectedCount();
    
    // Add event listener for the Create Report button
    const createReportBtn = document.getElementById('create-report-btn');
    if (createReportBtn) {
        createReportBtn.addEventListener('click', createCombinedReport);
    }
});

// Simplify a document with Gemini AI
async function simplifyDocument(documentId) {
    // Find the document item in the list
    const documentItem = document.querySelector(`div[data-id="${documentId}"]`);
    if (!documentItem) {
        console.error('Document item not found in DOM');
        return;
    }
    
    // Update the processing status in the UI
    const statusElement = documentItem.querySelector('.flex.items-center');
    if (statusElement) {
        // Add processing indicator
        const processingStatus = document.createElement('span');
        processingStatus.className = 'inline-flex items-center text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800 ml-2';
        processingStatus.innerHTML = `
            <svg class="w-3 h-3 mr-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing
        `;
        
        // Remove any existing status indicators
        const existingStatus = statusElement.querySelector('span.inline-flex');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Add the new processing indicator
        const titleElement = statusElement.querySelector('h3');
        if (titleElement) {
            titleElement.insertAdjacentElement('afterend', processingStatus);
        }
    }
    
    // Disable the simplify button
    const simplifyBtn = documentItem.querySelector('.simplify-btn');
    if (simplifyBtn) {
        simplifyBtn.disabled = true;
        simplifyBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    try {
        // Show loading indicator
        Swal.fire({
            title: 'Processing Document',
            html: 'Simplifying document with Gemini AI...<br>This may take a minute or two.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Call the API to process the document
        const response = await fetch(`/api/documents/simplify/${documentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process document');
        }
        
        const result = await response.json();
        
        // Close the loading indicator
        Swal.close();
        
        if (result.success) {
            console.log('Document processed successfully:', result);
            
            // Update the document in the UI to show processed status
            const updatedStatus = document.createElement('span');
            updatedStatus.className = 'inline-flex items-center text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800 ml-2';
            updatedStatus.innerHTML = `
                <svg class="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Processed
            `;
            
            // Replace the processing indicator with the processed status
            const existingStatus = statusElement.querySelector('span.inline-flex');
            if (existingStatus) {
                existingStatus.replaceWith(updatedStatus);
            }
            
            // Re-enable the simplify button
            if (simplifyBtn) {
                simplifyBtn.disabled = false;
                simplifyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            
            // Show the processed document
            openProcessedDocument(result.document);
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error processing document:', error);
        
        // Update UI to show error state
        if (statusElement) {
            const errorStatus = document.createElement('span');
            errorStatus.className = 'inline-flex items-center text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-800 ml-2';
            errorStatus.innerHTML = `
                <svg class="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
                Failed
            `;
            
            // Replace the processing indicator
            const existingStatus = statusElement.querySelector('span.inline-flex');
            if (existingStatus) {
                existingStatus.replaceWith(errorStatus);
            }
        }
        
        // Re-enable the simplify button
        if (simplifyBtn) {
            simplifyBtn.disabled = false;
            simplifyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        
        // Show error message
        Swal.fire({
            icon: 'error',
            title: 'Processing Failed',
            text: error.message || 'Failed to process document with Gemini AI',
            confirmButtonColor: '#16a34a'
        });
    }
}

// Open processed document in modal
function openProcessedDocument(doc) {
    Swal.fire({
        title: doc.fileName,
        width: '80%',
        html: `
            <div class="mb-4 border-b border-gray-200">
                <ul class="flex flex-wrap -mb-px text-sm font-medium text-center" role="tablist">
                    <li class="mr-2" role="presentation">
                        <button class="inline-block p-4 border-b-2 rounded-t-lg border-health-500 active" 
                            id="simplified-tab" data-tabs-target="#simplified-content" type="button" role="tab" 
                            aria-controls="simplified" aria-selected="true">Simplified</button>
                    </li>
                    <li class="mr-2" role="presentation">
                        <button class="inline-block p-4 border-b-2 rounded-t-lg border-transparent hover:border-gray-300"
                            id="original-tab" data-tabs-target="#original-content" type="button" role="tab" 
                            aria-controls="original" aria-selected="false">Original</button>
                    </li>
                    <li role="presentation">
                        <button class="inline-block p-4 border-b-2 rounded-t-lg border-transparent hover:border-gray-300"
                            id="medications-tab" data-tabs-target="#medications-content" type="button" role="tab" 
                            aria-controls="medications" aria-selected="false">Medications</button>
                    </li>
                </ul>
            </div>
            <div id="tab-content">
                <div class="block p-4 text-left" id="simplified-content" role="tabpanel" aria-labelledby="simplified-tab">
                    ${renderMarkdown(doc.processedContent)}
                </div>
                <div class="hidden p-4" id="original-content" role="tabpanel" aria-labelledby="original-tab">
                    <iframe src="${doc.fileUrl}" width="100%" height="600" class="border"></iframe>
                </div>
                <div class="hidden p-4" id="medications-content" role="tabpanel" aria-labelledby="medications-tab">
                    ${renderMedicationList(doc.medications)}
                </div>
            </div>
        `,
        showCloseButton: true,
        showConfirmButton: false,
        focusConfirm: false,
        didOpen: () => {
            // Setup tab switching
            const tabs = document.querySelectorAll('[role="tab"]');
            const tabContents = document.querySelectorAll('[role="tabpanel"]');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Hide all tab contents
                    tabContents.forEach(content => {
                        content.classList.add('hidden');
                        content.classList.remove('block');
                    });
                    
                    // Remove active class from all tabs
                    tabs.forEach(t => {
                        t.classList.remove('border-health-500');
                        t.classList.add('border-transparent');
                        t.setAttribute('aria-selected', 'false');
                    });
                    
                    // Show the selected tab content
                    const target = document.querySelector(tab.dataset.tabsTarget);
                    target.classList.remove('hidden');
                    target.classList.add('block');
                    
                    // Set active class on selected tab
                    tab.classList.remove('border-transparent');
                    tab.classList.add('border-health-500');
                    tab.setAttribute('aria-selected', 'true');
                });
            });
        }
    });
}

// Toggle document selection
async function toggleDocumentSelection(documentId, isSelected) {
    // Update UI immediately to appear responsive
    if (isSelected) {
        selectedDocuments.add(documentId);
    } else {
        selectedDocuments.delete(documentId);
    }
    
    // Update UI to show selected document count right away
    updateSelectedCount();
    
    // Then send update to server in the background
    try {
        const response = await fetch(`/api/documents/select/${documentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error updating document selection:', errorData.error);
            // Don't show visible error to user, just log it
        }
    } catch (error) {
        console.error('Error toggling document selection:', error);
        // Don't revert the UI or show error message to maintain responsiveness
    }
}

// Update selected document count
function updateSelectedCount() {
    const selectedCount = selectedDocuments.size;
    
    // Update selected count display if it exists
    const selectedCountElem = document.getElementById('selected-count');
    if (selectedCountElem) {
        selectedCountElem.textContent = `${selectedCount} selected`;
    }
    
    // Update Create Report button state
    const createReportBtn = document.getElementById('create-report-btn');
    if (createReportBtn) {
        if (selectedCount > 0) {
            createReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            createReportBtn.classList.add('bg-health-600', 'hover:bg-health-700');
            createReportBtn.classList.remove('bg-health-300', 'hover:bg-health-300');
            createReportBtn.removeAttribute('disabled');
        } else {
            createReportBtn.classList.add('opacity-50', 'cursor-not-allowed');
            createReportBtn.classList.remove('bg-health-600', 'hover:bg-health-700');
            createReportBtn.classList.add('bg-health-300', 'hover:bg-health-300');
            createReportBtn.setAttribute('disabled', 'true');
        }
    }
}

// Create a combined report from selected documents
async function createCombinedReport() {
    try {
        const selectedCheckboxes = document.querySelectorAll('.select-doc-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            showError('Please select at least one document to create a report.');
            return;
        }
        
        // Get selected document IDs
        const documentIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.dataset.id);
        
        // Show loading indicator
        Swal.fire({
            title: 'Creating Report',
            html: 'Generating combined report from selected documents...<br>This may take a minute or two.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Create the combined report
        const response = await fetch('/api/documents/combined-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ documentIds })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create combined report');
        }
        
        const result = await response.json();
        
        // Close the loading indicator
        Swal.close();
        
        if (result.success) {
            // If there's a redirect URL, use it for direct navigation
            if (result.redirectUrl) {
                Swal.fire({
                    icon: 'success',
                    title: 'Report Created!',
                    text: 'Your combined report has been created and is ready to view.',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    // Navigate to the report page
                    window.location.href = result.redirectUrl;
                });
            } else if (result.report && result.report.id) {
                Swal.fire({
                    icon: 'success',
                    title: 'Report Created',
                    text: 'Your combined report has been created successfully.',
                    showCancelButton: true,
                    confirmButtonText: 'View Report',
                    cancelButtonText: 'Close',
                    confirmButtonColor: '#15803d',
                }).then((result) => {
                    if (result.isConfirmed && result.report && result.report.id) {
                        // Redirect to the report page
                        window.location.href = `/reports/${result.report.id}`;
                    }
                });
            } else {
                // Fallback if no report ID or redirect URL provided
                Swal.fire({
                    icon: 'success',
                    title: 'Report Created',
                    text: 'Your combined report has been created. Visit the Reports page to view it.',
                    confirmButtonText: 'Go to Reports',
                    confirmButtonColor: '#15803d',
                }).then(() => {
                    window.location.href = '/reports';
                });
            }
            
            // Uncheck all checkboxes
            selectedCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Clear selected documents
            selectedDocuments.clear();
            
            // Update selected count
            updateSelectedCount();
        } else {
            throw new Error(result.error || 'Failed to create combined report');
        }
    } catch (error) {
        console.error('Error creating combined report:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Report Creation Failed',
            text: error.message || 'Failed to create combined report. Please try again.',
            confirmButtonColor: '#15803d'
        });
    }
}

// Search and filter documents
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('type-filter');
    const statusFilter = document.getElementById('status-filter');
    
    if (!searchInput || !typeFilter || !statusFilter) {
        return;
    }
    
    const filterDocuments = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const typeValue = typeFilter.value;
        const statusValue = statusFilter.value;
        
        const documentItems = documentList.querySelectorAll('div[data-id]');
        
        let visibleCount = 0;
        
        documentItems.forEach(item => {
            const fileName = item.querySelector('h3').textContent.toLowerCase();
            const isProcessed = item.querySelector('.bg-green-100') !== null;
            const isProcessing = item.querySelector('.bg-blue-100') !== null;
            const documentType = item.dataset.type;
            
            let isVisible = true;
            
            // Apply search filter
            if (searchTerm && !fileName.includes(searchTerm)) {
                isVisible = false;
            }
            
            // Apply type filter
            if (typeValue !== 'all' && documentType !== typeValue) {
                isVisible = false;
            }
            
            // Apply status filter
            if (statusValue === 'processed' && !isProcessed) {
                isVisible = false;
            } else if (statusValue === 'unprocessed' && isProcessed) {
                isVisible = false;
            } else if (statusValue === 'processing' && !isProcessing) {
                isVisible = false;
            }
            
            // Show/hide document item
            if (isVisible) {
                item.classList.remove('hidden');
                visibleCount++;
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Show empty state if no documents match the filters
        if (visibleCount === 0 && documentItems.length > 0) {
            emptyState.classList.remove('hidden');
            emptyState.innerHTML = `
                <svg class="w-16 h-16 mx-auto text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 class="mt-4 text-lg font-medium text-gray-900">No documents match your filters</h3>
                <p class="mt-2 text-gray-600">Try changing your search or filter settings.</p>
                <button id="reset-filters" class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-health-600 hover:bg-health-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-health-500">
                    Reset Filters
                </button>
            `;
            
            // Add reset button listener
            document.getElementById('reset-filters').addEventListener('click', () => {
                searchInput.value = '';
                typeFilter.value = 'all';
                statusFilter.value = 'all';
                filterDocuments();
            });
        } else if (visibleCount > 0) {
            emptyState.classList.add('hidden');
        }
    };
    
    // Add event listeners for filters
    searchInput.addEventListener('input', filterDocuments);
    typeFilter.addEventListener('change', filterDocuments);
    statusFilter.addEventListener('change', filterDocuments);
    
    // Return the filter function for initial call
    return filterDocuments;
}

// Add filters and batch actions HTML to the page
function setupFilterUI() {
    // Add filters section to the page
    const filtersSection = document.createElement('div');
    filtersSection.className = 'mb-6 p-4 bg-white rounded-lg shadow';
    filtersSection.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div class="flex flex-wrap gap-2">
                <select id="type-filter" class="rounded-md border-gray-300 shadow-sm focus:border-health-500 focus:ring focus:ring-health-500 focus:ring-opacity-50">
                    <option value="all">All Types</option>
                    <option value="PRESCRIPTION">Prescriptions</option>
                    <option value="LAB_REPORT">Lab Reports</option>
                    <option value="CLINICAL_NOTES">Clinical Notes</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="MISCELLANEOUS">Miscellaneous</option>
                </select>
                <select id="status-filter" class="rounded-md border-gray-300 shadow-sm focus:border-health-500 focus:ring focus:ring-health-500 focus:ring-opacity-50">
                    <option value="all">All Status</option>
                    <option value="processed">Processed</option>
                    <option value="unprocessed">Unprocessed</option>
                    <option value="processing">Processing</option>
                </select>
            </div>
        </div>
    `;
    
    // Add batch actions section
    const batchActionsSection = document.createElement('div');
    batchActionsSection.className = 'mb-6 p-4 bg-white rounded-lg shadow';
    batchActionsSection.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <input type="checkbox" id="select-all-checkbox" class="h-4 w-4 text-health-600 focus:ring-health-500 border-gray-300 rounded">
                <label for="select-all-checkbox" class="text-sm text-gray-700">Select All</label>
                <span class="text-sm text-gray-500">(<span id="selected-count">0</span> selected)</span>
            </div>
            <button id="create-report-btn" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-health-600 hover:bg-health-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-health-500 opacity-50 cursor-not-allowed" disabled>
                <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Create Report
            </button>
        </div>
    `;
    
    // Insert filters and batch actions before the document list
    documentList.parentNode.insertBefore(filtersSection, documentList);
    documentList.parentNode.insertBefore(batchActionsSection, documentList);
    
    // Setup select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.select-doc-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
            toggleDocumentSelection(checkbox.dataset.id, this.checked);
        });
        updateSelectedCount();
    });
    
    // Setup create report button
    const createReportBtn = document.getElementById('create-report-btn');
    createReportBtn.addEventListener('click', createCombinedReport);
    
    // Initialize filters
    const filterFunc = setupFilters();
    if (filterFunc) {
        filterFunc();
    }
} 