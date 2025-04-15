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
    documentItem.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
    documentItem.dataset.id = documentData.id;
    documentItem.dataset.filename = documentData.fileName.toLowerCase();
    
    // Format date
    const createdAt = documentData.createdAt ? new Date(documentData.createdAt) : new Date();
    const formattedDate = createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Set document item content
    documentItem.innerHTML = `
        <div class="flex items-center">
            <svg class="w-8 h-8 text-health-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
                <h3 class="font-medium">${documentData.fileName}</h3>
                <p class="text-sm text-gray-500">Uploaded on ${formattedDate}</p>
            </div>
        </div>
        <div class="flex space-x-2">
            <button class="view-btn p-2 text-gray-500 hover:text-health-500" data-url="${documentData.fileUrl}">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </button>
            <button class="download-btn p-2 text-gray-500 hover:text-health-500" data-url="${documentData.fileUrl}" data-filename="${documentData.fileName}">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
            <button class="delete-btn p-2 text-gray-500 hover:text-red-500" data-id="${documentData.id}">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    `;
    
    // Add document item to the list
    documentList.prepend(documentItem);
    
    // Add event listeners for buttons
    const viewBtn = documentItem.querySelector('.view-btn');
    const downloadBtn = documentItem.querySelector('.download-btn');
    const deleteBtn = documentItem.querySelector('.delete-btn');
    
    viewBtn.addEventListener('click', function() {
        const fileUrl = this.dataset.url;
        window.open(fileUrl, '_blank');
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
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
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

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload();
    setupSearch();
}); 