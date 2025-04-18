// Initialize Firestore and Auth variables, but defer initialization
let db;
let auth;

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

// --- Caching Constants --- 
const DOCS_CACHE_KEY = 'rxplain_docs_cache';
const DOCS_CACHE_EXPIRY_KEY = 'rxplain_docs_cache_expiry';
const DOCS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Keep track of selected documents (UI state only)
let selectedDocuments = new Set();

// Keep track of currently displayed documents (for comparison)
let currentlyDisplayedDocs = [];

// Hide loading indicator if it exists
if (navLoadingIndicator) {
    navLoadingIndicator.style.display = 'none';
}

// Supported file types and max size (10MB)
const supportedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes

// --- Function Definitions ---

// Function to initialize dashboard UI elements (listeners, etc.)
function initializeDashboardUI() {
    setupFilterUI();
    setupFileUpload();
    // setupSearch(); // REMOVED - Handled by setupFilters called within setupFilterUI
    
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
    
    // Activate the correct nav item
    // REMOVED: setActiveNavItem('/dashboard'); // This is now handled globally in firebase-client.js
}

// Function to set the active nav item - MOVED TO firebase-client.js
/* function setActiveNavItem(path) {
    const navLinks = document.querySelectorAll('#logged-in-nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('bg-health-700', 'text-white');
            link.classList.remove('text-gray-300', 'hover:bg-health-700', 'hover:text-white');
        } else {
            link.classList.remove('bg-health-700', 'text-white');
            link.classList.add('text-gray-300', 'hover:bg-health-700', 'hover:text-white');
        }
    });
} */

// --- NEW Caching and Fetching Logic ---

// Function to load documents from cache IF available and valid
function loadDocumentsFromCache() {
    console.log('[Dashboard.js] Entering loadDocumentsFromCache...');
    const cachedData = localStorage.getItem(DOCS_CACHE_KEY);
    const cacheExpiry = localStorage.getItem(DOCS_CACHE_EXPIRY_KEY);
    const now = new Date().getTime();
    console.log(`[Dashboard.js] Docs Cache check: now=${now}, expiry=${cacheExpiry}`);

    if (cachedData && cacheExpiry && now < parseInt(cacheExpiry)) {
        console.log('[Dashboard.js] Docs Cache HIT and VALID. Attempting to parse.');
        try {
            const parsedData = JSON.parse(cachedData);
            if (parsedData && Array.isArray(parsedData.documents)) {
                console.log('[Dashboard.js] Cached docs data structure valid. Using cache.');
                currentlyDisplayedDocs = parsedData.documents; 
                renderDocumentList(currentlyDisplayedDocs); // Render immediately
                // Ensure loading/empty states are correctly hidden/shown
                loadingPlaceholder?.classList.add('hidden'); // Use optional chaining
                if (currentlyDisplayedDocs.length > 0) {
                    documentList.classList.remove('hidden');
                    emptyState.classList.add('hidden');
                } else {
                     documentList.classList.add('hidden');
                     showEmptyState(); // Use existing function for consistency
                }
                console.log('[Dashboard.js] Exiting loadDocumentsFromCache (used cache).');
                return true; // Indicate cache was used
            } else {
                console.warn('[Dashboard.js] Cached docs data structure invalid. Clearing cache.', parsedData);
                clearDocsCache(false);
            }
        } catch (e) {
            console.error('[Dashboard.js] Error parsing cached docs data. Clearing cache.', e);
            clearDocsCache(false);
        }
    } else if (cachedData) {
         console.log('[Dashboard.js] Docs Cache HIT but EXPIRED.');
    } else {
         console.log('[Dashboard.js] Docs Cache MISS.');
    }
    console.log('[Dashboard.js] Exiting loadDocumentsFromCache (did NOT use cache).');
    return false;
}

// Function to fetch documents from the server
async function fetchDocumentsFromServer() {
    console.log('[Dashboard.js] Entering fetchDocumentsFromServer...');
    const fetchUrl = '/api/documents/user-documents';
    try {
        const response = await fetch(fetchUrl);
        console.log(`[Dashboard.js] Docs API response status: ${response.status} ${response.statusText}`);
        const rawText = await response.text(); // Get text for better debugging
        if (!response.ok) {
             console.error('[Dashboard.js] Docs API Response not OK. Raw text:', rawText);
             throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
        }
        const data = JSON.parse(rawText);
        console.log('[Dashboard.js] Parsed docs data from server:', data);
        if (data && Array.isArray(data.documents)) {
            console.log(`[Dashboard.js] Successfully fetched ${data.documents.length} documents from server.`);
            return data.documents;
        } else {
            console.error('[Dashboard.js] Invalid docs response structure from server:', data);
            throw new Error('Invalid document data structure from server');
        }
    } catch (error) {
        console.error('[Dashboard.js] Error during fetchDocumentsFromServer:', error);
        throw error;
    }
}

// Function to compare document lists (simple comparison based on IDs and maybe updatedAt)
function areDocumentListsDifferent(listA, listB) {
    console.log(`[Dashboard.js] Comparing doc lists. List A length: ${listA.length}, List B length: ${listB.length}`);
    if (listA.length !== listB.length) {
        console.log('[Dashboard.js] Doc lists have different lengths. Result: true');
        return true;
    }
    const mapA = new Map(listA.map(doc => [doc.id, doc.updatedAt || doc.createdAt]));
    for (const docB of listB) {
        if (!mapA.has(docB.id) || mapA.get(docB.id) !== (docB.updatedAt || docB.createdAt)) {
            console.log(`[Dashboard.js] Difference found for doc ${docB.id}. Result: true`);
            return true; // Found a new doc or an updated doc
        }
    }
    console.log('[Dashboard.js] Doc lists appear identical. Result: false');
    return false;
}

// Function to save data to cache
function cacheDocumentsData(docs) {
    console.log(`[Dashboard.js] Attempting to cache ${docs.length} docs.`);
    const now = new Date().getTime();
    // Store the raw array structure expected by the cache loader
    const dataToCache = { documents: docs }; 
    try {
        localStorage.setItem(DOCS_CACHE_KEY, JSON.stringify(dataToCache));
        localStorage.setItem(DOCS_CACHE_EXPIRY_KEY, (now + DOCS_CACHE_DURATION).toString());
        console.log('[Dashboard.js] Successfully updated docs cache.');
    } catch (e) {
        console.warn('[Dashboard.js] Failed to cache docs data:', e);
    }
}

// --- End NEW Caching and Fetching Logic ---

// RENDER Document List (Replaces direct manipulation in loadDocuments)
function renderDocumentList(docs) {
    console.log(`[Dashboard.js] Entering renderDocumentList with ${docs ? docs.length : 'null'} documents.`);
    if (!documentList || !emptyState) { // Add check for required elements
        console.error("[Dashboard.js] Cannot render document list: target elements missing.");
        return;
    }
    
    // Clear previous content
    documentList.innerHTML = '';
    
    if (!docs || docs.length === 0) {
        console.log('[Dashboard.js] No documents to render. Showing empty state.');
        documentList.classList.add('hidden');
        showEmptyState(); // Use existing function
        return;
    }
    
    console.log('[Dashboard.js] Rendering document items...');
    documentList.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // Sort documents by creation date (newest first) - Apply sorting here
    docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    docs.forEach(documentData => {
        addDocumentToList(documentData); // Calls the existing function to create and append ONE item
    });
     console.log('[Dashboard.js] Finished rendering document items.');
}

// MODIFIED loadDocuments - Now acts as the trigger/orchestrator
async function loadDocuments() {
    console.log('[Dashboard.js] Entering loadDocuments (now initializeDocumentsDisplay)...');
    // This function is now primarily called after auth confirmation or after upload.
    // It triggers the fetch-compare-cache-render sequence.
    
    // Show a less intrusive loading state? Maybe a spinner near the title?
    // For now, we rely on the background fetch not being too slow after initial cache load.

    try {
        const freshDocs = await fetchDocumentsFromServer();
        console.log(`[Dashboard.js] loadDocuments: Fetched ${freshDocs.length} fresh docs.`);
        
        // Compare with potentially cached data that's already displayed
        if (areDocumentListsDifferent(currentlyDisplayedDocs, freshDocs)) {
            console.log('[Dashboard.js] loadDocuments: Server data differs from displayed. Updating display.');
            currentlyDisplayedDocs = freshDocs;
            renderDocumentList(currentlyDisplayedDocs);
            // Optionally show an update notice like in reports.js
        } else {
            console.log('[Dashboard.js] loadDocuments: Server data matches displayed. No UI update needed.');
        }
        
        // Cache the fresh data
        cacheDocumentsData(freshDocs); 

    } catch (error) {
        console.error('[Dashboard.js] Error in loadDocuments (fetch stage):', error);
        // If cache wasn't displayed initially (handled in startDashboard), 
        // we might need error display here too. But usually, cache is shown first.
        showErrorNotice('Could not refresh document list.'); // Use new notice function
        // Avoid calling showEmptyState here unless we know cache failed AND fetch failed.
    }
    console.log('[Dashboard.js] Exiting loadDocuments (initializeDocumentsDisplay).');
}

// Show empty state
function showEmptyState() {
    documentList.classList.add('hidden');
    emptyState.classList.remove('hidden');
}

// Show error message (for upload/general errors, might be less used now)
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Add document to the list (Now just creates and appends ONE item)
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
            <span class="inline-flex items-center text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 ml-2">
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
                <button class="simplify-btn p-2 text-gray-500 hover:text-blue-500" data-id="${documentData.id}" title="Simplify with AI" data-is-processed="${documentData.isProcessed || false}">
                    <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </button>
                <button class="rename-btn p-2 text-gray-500 hover:text-yellow-500" data-id="${documentData.id}" data-name="${documentData.fileName}" title="Rename">
                    <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
    
    // Append item to the list (modified from prepend)
    documentList.appendChild(documentItem);
    
    // Add event listeners for buttons (keep existing logic)
    const viewBtn = documentItem.querySelector('.view-btn');
    const simplifyBtn = documentItem.querySelector('.simplify-btn');
    const downloadBtn = documentItem.querySelector('.download-btn');
    const deleteBtn = documentItem.querySelector('.delete-btn');
    const checkbox = documentItem.querySelector('.select-doc-checkbox');
    const renameBtn = documentItem.querySelector('.rename-btn');
    
    viewBtn.addEventListener('click', function() {
        const fileUrl = this.dataset.url;
        window.open(fileUrl, '_blank');
    });
    
    simplifyBtn.addEventListener('click', function() {
        const documentId = this.dataset.id;
        simplifyDocument(documentId);
    });
    
    renameBtn.addEventListener('click', function() {
        const documentId = this.dataset.id;
        const currentName = this.dataset.name;
        renameDocument(documentId, currentName, documentItem);
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
}

// Rename document function
async function renameDocument(documentId, currentName, documentItem) {
    if (!Swal) {
        console.error('SweetAlert (Swal) is not available.');
        showError('UI component missing. Cannot rename.');
        return;
    }

    const { value: newName } = await Swal.fire({
        title: 'Rename Document',
        input: 'text',
        inputValue: currentName,
        inputLabel: 'New file name',
        inputPlaceholder: 'Enter the new file name',
        showCancelButton: true,
        confirmButtonText: 'Rename',
        confirmButtonColor: '#16a34a',
        inputValidator: (value) => {
            if (!value || value.trim().length === 0) {
                return 'File name cannot be empty!'
            }
            // Basic validation (e.g., avoid slashes), add more as needed
            if (/[/\\:*?"<>|]/.test(value)) {
                 return 'Invalid characters in file name.';
            }
        }
    });

    if (newName && newName.trim() !== currentName) {
        console.log(`Attempting to rename document ${documentId} to ${newName.trim()}`);
        try {
            const response = await fetch(`/api/documents/${documentId}/rename`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newName: newName.trim() })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Update UI
                    const nameElement = documentItem.querySelector('h3');
                    if (nameElement) {
                        nameElement.textContent = result.newName; // Use name returned from server
                    }
                    // Update the button's data-name attribute too
                    const renameButton = documentItem.querySelector('.rename-btn');
                    if (renameButton) {
                         renameButton.dataset.name = result.newName;
                    }
                    // Update download button data-filename if needed
                    const downloadButton = documentItem.querySelector('.download-btn');
                    if (downloadButton) {
                         downloadButton.dataset.filename = result.newName;
                    }
                    Swal.fire('Renamed!', 'Document name updated successfully.', 'success');
                } else {
                    throw new Error(result.error || 'Failed to rename on server');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error renaming document:', error);
            Swal.fire('Error', `Could not rename document: ${error.message}`, 'error');
        }
    } else if (newName && newName.trim() === currentName) {
        console.log('Rename cancelled or name unchanged.');
    }
}

// Delete document
async function deleteDocument(documentId, documentItem) {
    if (!Swal) {
        console.error('SweetAlert (Swal) is not available.');
        showError('UI component missing. Cannot delete.');
        return;
    }
    
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this! The original file will be deleted.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        console.log(`Attempting to delete document ${documentId}`);
        try {
            // Show some temporary deleting state on the item?
            documentItem.style.opacity = '0.5'; 

            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove document item from the list with animation
                documentItem.classList.add('animate-fade-out'); // Add fade-out animation class
                setTimeout(() => {
                     documentItem.remove();
                     // Show empty state if no documents left
                     if (documentList.children.length === 0) {
                         showEmptyState();
                     }
                     // Update selected count if the deleted item was selected
                     if (selectedDocuments.has(documentId)) {
                         selectedDocuments.delete(documentId);
                         updateSelectedCount();
                     }
                }, 500); // Match animation duration

                Swal.fire('Deleted!', 'Your document has been deleted.', 'success');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            documentItem.style.opacity = '1'; // Restore opacity on error
            Swal.fire('Error', `Could not delete document: ${error.message}`, 'error');
        }
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
                item.style.display = '';
                hasVisibleItems = true;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Show empty state if no documents match the search
        const currentEmptyState = document.getElementById('empty-state');
        if (!hasVisibleItems && documentItems.length > 0) {
             if (currentEmptyState) {
                currentEmptyState.innerHTML = `
                    <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>No documents match your search.</p>
                    <p>Try a different search term.</p>
                `;
                currentEmptyState.classList.remove('hidden');
             }
        } else if (hasVisibleItems) {
             if (currentEmptyState) currentEmptyState.classList.add('hidden');
        }
    });
}

// Render markdown content
function renderMarkdown(markdown) {
    if (!markdown) return '<p>No content available</p>';
    
    // Use the Marked.js library to render markdown
    if (typeof marked !== 'undefined') {
        return marked.parse(markdown);
    }
    return '<p>Markdown renderer not available.</p>';
}

// Render medication list
function renderMedicationList(medications) {
    if (!medications || medications.length === 0) {
        return '<p class="text-gray-600 px-4 py-2">No medications found in this document.</p>';
    }

    let html = '<div class="space-y-6 divide-y divide-gray-200 px-1">'; // Added padding and divider

    medications.forEach((med, index) => {
        // --- Updated Fallback Logic --- 
        let medName = med.Name?.Generic || med.Name?.Brand;
        let isNameExtracted = !!medName; // Flag to know if we found a real extracted name

        if (!isNameExtracted) {
            if (med.SuggestedName) { // Check for AI Suggested Name first
                medName = med.SuggestedName;
            } else if (med.Purpose) { // Then check Purpose
                // Truncate purpose and use as fallback
                const truncatedPurpose = med.Purpose.length > 40 ? med.Purpose.substring(0, 40) + '...' : med.Purpose;
                medName = `Medication (Purpose: ${truncatedPurpose})`;
            } else { // Finally, use numbered entry
                // Numbered fallback if no name or purpose
                medName = `Medication Entry #${index + 1}`;
            }
        }
        // --- End Updated Fallback Logic --- 

        // Apply italic style if the name was NOT specifically extracted (Generic/Brand)
        const nameStyleClass = isNameExtracted ? 'text-blue-800' : 'text-blue-700 italic'; 

        // Use <dl> for better structure and spacing
        html += `
            <div class="pt-4 ${index === 0 ? 'pb-4' : 'py-4'}"> 
                <h3 class="text-xl font-semibold mb-3 ${nameStyleClass}">${medName}</h3>
                <dl class="grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-6">
                    ${med.Dosage ? `<div class="sm:col-span-1"><dt class="font-medium text-gray-600">Dosage:</dt> <dd class="mt-1 text-gray-800">${med.Dosage}</dd></div>` : ''}
                    ${med.Frequency ? `<div class="sm:col-span-1"><dt class="font-medium text-gray-600">Frequency:</dt> <dd class="mt-1 text-gray-800">${med.Frequency}</dd></div>` : ''}
                    ${med.Purpose ? `<div class="sm:col-span-2"><dt class="font-medium text-gray-600">Purpose:</dt> <dd class="mt-1 text-gray-800">${med.Purpose}</dd></div>` : ''}
                    ${med['Special Instructions'] ? `<div class="sm:col-span-2"><dt class="font-medium text-gray-600">Instructions:</dt> <dd class="mt-1 text-gray-800">${med['Special Instructions']}</dd></div>` : ''}
                    ${med['Important Side Effects'] ? `<div class="sm:col-span-2"><dt class="font-medium text-red-700">Warnings:</dt> <dd class="mt-1 text-red-600">${med['Important Side Effects']}</dd></div>` : ''}
                </dl>
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

// Simplify a document with Gemini AI
async function simplifyDocument(documentId) {
    // Find the document item in the list
    const documentItem = document.querySelector(`div[data-id="${documentId}"]`);
    if (!documentItem) {
        console.error('Document item not found in DOM');
        return;
    }
    
    // --- Get status and set appropriate titles ---
    const simplifyBtn = documentItem.querySelector('.simplify-btn');
    const isAlreadyProcessed = simplifyBtn ? (simplifyBtn.dataset.isProcessed === 'true') : false;
    const swalTitle = isAlreadyProcessed ? 'Loading Simplified Document' : 'Processing Document';
    const swalHtml = isAlreadyProcessed 
        ? 'Fetching previously simplified content...' 
        : 'Simplifying document with Gemini AI...<br>This may take a minute or two.';
    // --- End status check ---

    // Update the processing status in the UI (only show spinner if actually processing)
    let processingIndicatorElement = null;
    const statusElementContainer = documentItem.querySelector('.flex-grow .flex.items-center'); 
    if (statusElementContainer && !isAlreadyProcessed) { // Only add spinner if not already processed
        // Remove any existing status indicators first
        const existingStatuses = statusElementContainer.querySelectorAll('span.inline-flex');
        existingStatuses.forEach(span => span.remove());

        // Add processing indicator
        processingIndicatorElement = document.createElement('span');
        processingIndicatorElement.className = 'processing-indicator inline-flex items-center text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800 ml-2';
        processingIndicatorElement.innerHTML = `
            <svg class="w-3 h-3 mr-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing
        `;
        
        // Add the new processing indicator after the title
        const titleElement = statusElementContainer.querySelector('h3');
        if (titleElement) {
            titleElement.insertAdjacentElement('afterend', processingIndicatorElement);
        }
    }
    
    // Disable the simplify button
    if (simplifyBtn) {
        simplifyBtn.disabled = true;
        simplifyBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    try {
        // Show loading indicator (SweetAlert) with conditional title
        Swal.fire({
            title: swalTitle, // Use conditional title
            html: swalHtml,   // Use conditional html
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Call the API to process the document (Backend handles already processed case)
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
            console.log('Document processed/retrieved successfully:', result);
            
            // Update the document in the UI to show processed status (if it wasn't already)
             if (statusElementContainer && !isAlreadyProcessed) { // Only update status if it changed
                 // Remove processing indicator
                 if (processingIndicatorElement) processingIndicatorElement.remove();

                const updatedStatus = document.createElement('span');
                updatedStatus.className = 'inline-flex items-center text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800 ml-2';
                updatedStatus.innerHTML = `
                    <svg class="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    Processed
                `;
                // Add the new processed status indicator after the title
                const titleElement = statusElementContainer.querySelector('h3');
                 if (titleElement) {
                     titleElement.insertAdjacentElement('afterend', updatedStatus);
                 }
                 // Update the button state
                 if(simplifyBtn) simplifyBtn.dataset.isProcessed = 'true';
             }
            
            // Re-enable the simplify button
            if (simplifyBtn) {
                simplifyBtn.disabled = false;
                simplifyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            
            // Show the processed document modal
            openProcessedDocument(result.document);
        } else {
            throw new Error(result.error || 'Unknown error occurred during processing');
        }
    } catch (error) {
        console.error('Error processing document:', error);

         // Remove processing indicator if it exists
         if (processingIndicatorElement) processingIndicatorElement.remove();

        // Update UI to show error state (only if it wasn't already processed)
        if (statusElementContainer && !isAlreadyProcessed) { 
            const errorStatus = document.createElement('span');
            errorStatus.className = 'inline-flex items-center text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-800 ml-2';
            errorStatus.innerHTML = `
                <svg class="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
                Failed
            `;
            // Add the error status indicator after the title
            const titleElement = statusElementContainer.querySelector('h3');
             if (titleElement) {
                 titleElement.insertAdjacentElement('afterend', errorStatus);
             }
        }
        
        // Re-enable the simplify button
        if (simplifyBtn) {
            simplifyBtn.disabled = false;
            simplifyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        
        // Show error message (SweetAlert)
        Swal.fire({
            icon: 'error',
            title: isAlreadyProcessed ? 'Loading Failed' : 'Processing Failed', // Conditional title
            text: error.message || (isAlreadyProcessed ? 'Failed to load simplified document' : 'Failed to process document with Gemini AI'),
            confirmButtonColor: '#16a34a' // Or your theme color
        });
    }
}

// Open processed document in modal
async function openProcessedDocument(doc) {
    // Ensure Swal is loaded
    if (typeof Swal === 'undefined') {
        console.error("SweetAlert (Swal) is not loaded.");
        return;
    }
    
    // Ensure marked is loaded for markdown parsing
    if (typeof marked === 'undefined') {
        console.error("Marked.js is not loaded.");
        // Potentially show an error to the user or fallback to plain text
        return; 
    }

    Swal.fire({
        title: `<span class="text-xl font-semibold">${doc.fileName}</span>`,
        html: `
            <div class="border-b border-gray-200 mb-4">
                <nav class="-mb-px flex space-x-4 px-4" aria-label="Tabs">
                    <button id="simplified-tab" class="tab-button whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" onclick="switchTab('simplified')">
                        Simplified
                    </button>
                    <button id="original-tab" class="tab-button whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" onclick="switchTab('original')">
                        Original
                    </button>
                    <button id="medications-tab" class="tab-button whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm" onclick="switchTab('medications')">
                        Medications
                    </button>
                </nav>
            </div>
            <div class="text-left modal-content-area" style="max-height: calc(80vh - 150px); overflow-y: auto;"> 
                <div id="simplified-content" class="tab-content prose max-w-none p-4"> 
                    ${doc.processedContent ? marked.parse(doc.processedContent) : '<p>No simplified content available.</p>'}
                </div>
                <div id="original-content" class="tab-content hidden p-4"> 
                    <img src="${doc.fileUrl}" alt="Original Document" class="max-w-full h-auto mx-auto">
                </div>
                <div id="medications-content" class="tab-content hidden p-1"> 
                     ${renderMedicationList(doc.medications)}
                </div>
            </div>
        `,
        showCloseButton: true,
        showConfirmButton: false,
        width: '90%', // Use percentage for responsiveness
        customClass: { // Use customClass for more control
            popup: 'max-w-5xl !overflow-visible', // Set max-width, allow overflow for focus rings etc.
            htmlContainer: 'overflow-hidden modal-html-container', // Prevent Swal's internal scrollbars, add identifier
            title: 'pt-5 pr-10 pl-5', // Adjust title padding if needed
        },
        didOpen: () => { // Changed from willOpen to didOpen for potentially better timing
            // Initial tab setup (simplified active)
            // Add small delay to ensure DOM is fully ready after Swal inserts it
             setTimeout(() => switchTab('simplified'), 50); 
        }
    });
}

// Switch tabs in modal
function switchTab(tabName) {
    const modal = Swal.getPopup();
    if (!modal) {
        console.error('Modal popup not found for tab switching');
        return;
    }

    // Get all tab buttons and content panes within the specific modal instance
    const tabButtons = modal.querySelectorAll('.tab-button');
    const tabContents = modal.querySelectorAll('.tab-content');

    console.log(`Switching tab to: ${tabName}`, { tabButtons, tabContents }); // Debug log

    // Hide all content panes
    tabContents.forEach(content => {
        if (content) content.classList.add('hidden');
    });

    // Deactivate all tab buttons (reset styles)
    tabButtons.forEach(button => {
        if (button) {
           button.classList.remove('border-indigo-500', 'text-indigo-600');
           button.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
           button.setAttribute('aria-selected', 'false');
        }
    });

    // Activate the selected tab button and show the corresponding content pane
    const selectedButton = modal.querySelector(`#${tabName}-tab`);
    const selectedContent = modal.querySelector(`#${tabName}-content`);

    console.log(`Selected button:`, selectedButton);
    console.log(`Selected content:`, selectedContent);

    if (selectedButton) {
        selectedButton.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        selectedButton.classList.add('border-indigo-500', 'text-indigo-600');
        selectedButton.setAttribute('aria-selected', 'true');
    } else {
        console.warn(`Tab button not found for ID: #${tabName}-tab`);
    }

    if (selectedContent) {
        selectedContent.classList.remove('hidden');
    } else {
        console.warn(`Tab content not found for ID: #${tabName}-content`);
    }
}

// Toggle document selection (Handles LOCAL state only now)
async function toggleDocumentSelection(documentId, isSelected) {
    console.log(`[Dashboard.js] Toggling local selection for ${documentId} to ${isSelected}`);
    // Update UI immediately to appear responsive
    if (isSelected) {
        selectedDocuments.add(documentId);
    } else {
        selectedDocuments.delete(documentId);
    }
    
    // Update UI to show selected document count right away
    updateSelectedCount();
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
            createReportBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-health-300', 'hover:bg-health-300');
            createReportBtn.classList.add('bg-health-600', 'hover:bg-health-700');
            createReportBtn.removeAttribute('disabled');
        } else {
            createReportBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-health-300', 'hover:bg-health-300');
            createReportBtn.classList.remove('bg-health-600', 'hover:bg-health-700');
            createReportBtn.setAttribute('disabled', 'true');
        }
    }
    
    // Update select-all checkbox state
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const allDocCheckboxes = document.querySelectorAll('.select-doc-checkbox');
    if (selectAllCheckbox && allDocCheckboxes.length > 0) {
        selectAllCheckbox.checked = selectedCount === allDocCheckboxes.length;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < allDocCheckboxes.length;
    } else if (selectAllCheckbox) {
        selectAllCheckbox.checked = false; // No documents, not checked
        selectAllCheckbox.indeterminate = false;
    }
}

// Create a combined report from selected documents
async function createCombinedReport() {
    // Ensure `auth` and `Swal` are available
    if (typeof auth === 'undefined' || !auth.currentUser) {
        showError("Authentication error. Please log in again.");
        return;
    }
    if (typeof Swal === 'undefined') {
        showError("UI component (Swal) missing.");
        return;
    }

    try {
        const selectedIds = Array.from(selectedDocuments); // Use the Set directly
        
        if (selectedIds.length === 0) {
            showError('Please select at least one document to create a report.');
            return;
        }
        
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
            body: JSON.stringify({ documentIds: selectedIds }) // Send the IDs from the Set
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
                    timer: 2000, // Auto-close after 2 seconds
                    showConfirmButton: false
                }).then(() => {
                    // Navigate to the report page
                    window.location.href = result.redirectUrl;
                });
            } else if (result.report && result.report.id) {
                // If only report ID is returned
                 Swal.fire({
                    icon: 'success',
                    title: 'Report Created',
                    text: 'Your combined report has been created successfully.',
                    showCancelButton: true,
                    confirmButtonText: 'View Report',
                    cancelButtonText: 'Close',
                    confirmButtonColor: '#15803d', // Your theme color
                }).then((swalResult) => { // Rename inner variable to avoid conflict
                    if (swalResult.isConfirmed) {
                        // Redirect to the report page using the ID from the API response
                        window.location.href = `/reports/${result.report.id}`;
                    }
                });
            } else {
                // Fallback if neither report ID nor redirect URL is provided
                Swal.fire({
                    icon: 'success',
                    title: 'Report Created',
                    text: 'Your combined report has been created. Visit the Reports page to view it.',
                    confirmButtonText: 'Go to Reports',
                    confirmButtonColor: '#15803d', // Your theme color
                }).then(() => {
                    window.location.href = '/reports'; // Redirect to the general reports list
                });
            }
            
            // Uncheck all document checkboxes visually
             const allDocCheckboxes = document.querySelectorAll('.select-doc-checkbox');
             allDocCheckboxes.forEach(checkbox => {
                 checkbox.checked = false;
             });
            
            // Clear selected documents Set
            selectedDocuments.clear();
            
            // Update selected count and button state
            updateSelectedCount();
        } else {
            throw new Error(result.error || 'Failed to create combined report');
        }
    } catch (error) {
        console.error('Error creating combined report:', error); // Log the original error
        
         // Close loading Swal if it's still open due to error
         Swal.close(); 

        // Determine the message to show the user
        let displayMessage = 'Failed to create combined report. Please try again.'; // Default message
        if (error.response && typeof error.response.json === 'function') {
            // If it looks like a fetch response error, try to get the JSON body
            try {
                 const errorData = await error.response.json();
                 if (errorData && errorData.error) {
                    displayMessage = errorData.error; // Use the error message from the backend API
                 }
            } catch (parseError) {
                 console.error('Could not parse error response JSON:', parseError);
            }
        } else if (error.message) {
             // For other types of errors, use the error message if it doesn't look too technical
             // Avoid showing raw technical messages like the original Gemini error
             if (!error.message.includes('GoogleGenerativeAI Error') && !error.message.includes('googleapis.com')) {
                displayMessage = error.message;
             }
        }

        Swal.fire({
            icon: 'error',
            title: 'Report Creation Failed',
            text: displayMessage, // Show the user-friendly message
            confirmButtonColor: '#15803d' // Your theme color
        });
    }
}

// Search and filter documents
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('type-filter');
    const statusFilter = document.getElementById('status-filter');
    
    // Ensure elements exist before adding listeners
    if (!searchInput || !typeFilter || !statusFilter || !documentList) {
        console.warn("Filter elements or document list not found. Skipping filter setup.");
        return null; // Return null or undefined to indicate failure
    }
    
    const filterDocuments = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const typeValue = typeFilter.value;
        const statusValue = statusFilter.value;
        
        const documentItems = documentList.querySelectorAll('div[data-id]'); // Get all document items
        
        let visibleCount = 0;
        
        documentItems.forEach(item => {
            const fileName = item.querySelector('h3')?.textContent.toLowerCase() || '';
            const isProcessed = item.querySelector('.bg-green-100') !== null; // Check for processed badge
            const isProcessing = item.querySelector('.bg-blue-100.processing-indicator') !== null; // Check for processing indicator specifically
            const documentType = item.dataset.type || 'UNCLASSIFIED';
            
            let isVisible = true;
            
            // Apply search filter (check filename)
            if (searchTerm && !fileName.includes(searchTerm)) {
                isVisible = false;
            }
            
            // Apply type filter
            if (isVisible && typeValue !== 'all' && documentType !== typeValue) {
                isVisible = false;
            }
            
            // Apply status filter
            if (isVisible && statusValue !== 'all') {
                if (statusValue === 'processed' && !isProcessed) {
                    isVisible = false;
                } else if (statusValue === 'processing' && !isProcessing) {
                     isVisible = false;
                } else if (statusValue === 'unprocessed' && (isProcessed || isProcessing)) {
                    // Unprocessed means neither processed nor currently processing
                    isVisible = false;
                }
            }
            
            // Show/hide document item
            if (isVisible) {
                item.classList.remove('hidden');
                item.style.display = ''; // Reset display style if previously set to none
                visibleCount++;
            } else {
                item.classList.add('hidden');
                item.style.display = 'none'; // Explicitly hide
            }
        });
        
        // Show empty state if no documents match the filters
        const currentEmptyState = document.getElementById('empty-state'); // Re-get element
        if (currentEmptyState) {
           if (visibleCount === 0 && documentItems.length > 0) {
               currentEmptyState.classList.remove('hidden');
               // Check if reset button already exists to avoid duplicates
               if (!currentEmptyState.querySelector('#reset-filters')) {
                   currentEmptyState.innerHTML = `
                       <svg class="w-16 h-16 mx-auto text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                       </svg>
                       <h3 class="mt-4 text-lg font-medium text-gray-900">No documents match your filters</h3>
                       <p class="mt-2 text-gray-600">Try changing your search or filter settings.</p>
                       <button id="reset-filters" class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-health-600 hover:bg-health-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-health-500">
                           Reset Filters
                       </button>
                   `;
                   
                   // Add reset button listener inside the condition where it's created
                   const resetButton = currentEmptyState.querySelector('#reset-filters');
                   if (resetButton) {
                      resetButton.addEventListener('click', () => {
                           searchInput.value = '';
                           typeFilter.value = 'all';
                           statusFilter.value = 'all';
                           filterDocuments(); // Re-apply filters after resetting
                       });
                   }
               }
           } else if (visibleCount > 0 || documentItems.length === 0) {
               // Hide empty state if items are visible OR if there were never any items
               currentEmptyState.classList.add('hidden');
               currentEmptyState.innerHTML = ''; // Clear previous message
           }
        }
    };
    
    // Add event listeners for filters
    searchInput.addEventListener('input', filterDocuments);
    typeFilter.addEventListener('change', filterDocuments);
    statusFilter.addEventListener('change', filterDocuments);
    
    // Return the filter function so it can be called initially
    return filterDocuments;
}

// Add filters and batch actions HTML to the page
function setupFilterUI() {
    // Ensure documentList exists before trying to insert elements relative to it
    if (!documentList || !documentList.parentNode) {
        console.error("Document list container not found. Cannot set up filter UI.");
        return;
    }

    // Check if filters/actions already exist to prevent duplicates on hot-reload/navigation
    if (document.getElementById('type-filter') || document.getElementById('select-all-checkbox')) {
        console.log("Filter/Action UI already exists. Skipping setup.");
        return;
    }

    // Add filters section to the page
    const filtersSection = document.createElement('div');
    filtersSection.className = 'mb-6 p-4 bg-white rounded-lg shadow';
    filtersSection.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
             <div class="relative flex-grow md:flex-grow-0 md:mr-4">
                 <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                     <svg class="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                       <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                     </svg>
                 </span>
                 <input type="text" id="search-input" placeholder="Search documents..." class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-health-500 focus:border-health-500 sm:text-sm">
             </div>
            <div class="flex flex-wrap gap-2">
                <select 
                    id="type-filter" 
                    class="appearance-none block w-auto bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-health-500 focus:ring-1 focus:ring-health-500 shadow-sm text-sm"
                    style="background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3e%3cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3e%3c/svg%3e\"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.25em;" >
                    <option value="all">All Types</option>
                    <option value="PRESCRIPTION">Prescriptions</option>
                    <option value="LAB_REPORT">Lab Reports</option>
                    <option value="CLINICAL_NOTES">Clinical Notes</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="MISCELLANEOUS">Miscellaneous</option>
                    <option value="UNCLASSIFIED">Unclassified</option> 
                </select>
                <select 
                    id="status-filter" 
                    class="appearance-none block w-auto bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-health-500 focus:ring-1 focus:ring-health-500 shadow-sm text-sm"
                    style="background-image: url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3e%3cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3e%3c/svg%3e\"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.25em;" >
                    <option value="all">All Status</option>
                    <option value="processed">Processed</option>
                    <option value="processing">Processing</option>
                    <option value="unprocessed">Unprocessed</option>
                </select>
            </div>
        </div>
    `;
    
    // Add batch actions section
    const batchActionsSection = document.createElement('div');
    batchActionsSection.id = 'batch-actions-section'; // Give it an ID
    batchActionsSection.className = 'mb-6 p-4 bg-white rounded-lg shadow';
    batchActionsSection.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <input type="checkbox" id="select-all-checkbox" class="h-4 w-4 text-health-600 focus:ring-health-500 border-gray-300 rounded">
                <label for="select-all-checkbox" class="text-sm text-gray-700 select-none">Select All</label>
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
    
    // Setup select all checkbox listener
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
       selectAllCheckbox.addEventListener('change', function() {
           const isChecked = this.checked;
           // Select only currently visible documents if filters are applied
           const visibleCheckboxes = documentList.querySelectorAll('div[data-id]:not(.hidden) .select-doc-checkbox'); 
           
           visibleCheckboxes.forEach(checkbox => {
               if (checkbox.checked !== isChecked) { // Only toggle if state is different
                  checkbox.checked = isChecked;
                  // Trigger the toggle function to update the Set and potentially the backend
                  toggleDocumentSelection(checkbox.dataset.id, isChecked); 
               }
           });
           // Update count after potentially changing multiple selections
           updateSelectedCount(); 
       });
    }
    
    // Setup create report button listener (already done in initializeDashboardUI, but ensure element exists)
    const createReportBtn = document.getElementById('create-report-btn');
    if (createReportBtn && !createReportBtn.getAttribute('listener-added')) { // Prevent adding multiple listeners
       createReportBtn.addEventListener('click', createCombinedReport);
       createReportBtn.setAttribute('listener-added', 'true');
    }
    
    // Initialize filters and get the filter function
    const filterFunc = setupFilters();
    // Apply initial filtering if the function was returned successfully
    if (filterFunc) {
        filterFunc();
    }
}

// --- Main Execution Logic ---

// This function contains the core logic that depends on Firebase
async function startDashboard() {
    console.log("Firebase initialized, starting dashboard logic.");
    // Now that Firebase is initialized, get the instances
    // Use firebase.app().firestore() and firebase.app().auth() for clarity
    const app = firebase.app(); // Get the default initialized app
    db = app.firestore();
    auth = app.auth();

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
                
                // Create a session (optional, depends if backend needs it for every action)
                // Consider if this fetch is necessary on every auth state change
                const response = await fetch('/api/session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ idToken })
                });

                if (!response.ok) {
                    console.warn('Failed to refresh session:', response.statusText);
                    // Decide if this is critical. Maybe just log it?
                    // throw new Error('Failed to create session'); 
                }

                // User is signed in, load their documents
                await loadDocuments(); // Wait for documents to load initially
                
                // Initialize UI elements that depend on documents being loaded or auth state
                initializeDashboardUI(); 

            } catch (error) {
                console.error('Error during authenticated setup:', error);
                showError("Error loading your data. Please try refreshing.");
                // Redirect to login only if session creation is absolutely critical and failed
                 if (error.message.includes('Failed to create session')) {
                     window.location.href = '/login';
                 }
            }
        } else {
            // User is signed out, redirect to login
            console.log("User signed out, redirecting to login.");
            window.location.href = '/login';
        }

        // Hide loading indicator (might need adjustment based on async operations)
        if (navLoadingIndicator) {
            navLoadingIndicator.style.display = 'none';
        }
    });

    // Note: initializeDashboardUI() is now called *after* initial loadDocuments within onAuthStateChanged
    // This ensures UI setup happens after the first data load for an authenticated user.
}

// Wait for Firebase to be initialized before starting dashboard logic
// Check if the promise exists first
if (window.firebaseInitializationPromise) {
     window.firebaseInitializationPromise
         .then(startDashboard) // Run the main dashboard logic after Firebase initializes
         .catch(error => {
             console.error("Firebase initialization failed:", error);
             // Display error to the user
             const errorDiv = document.getElementById('error-message') || document.body; // Fallback
             errorDiv.textContent = "Application could not initialize due to a Firebase error. Please try refreshing the page.";
             errorDiv.classList.remove('hidden'); 
             // Consider disabling UI elements if needed
         });
} else {
     // This case should ideally not happen if scripts load correctly
     console.error("Firebase initialization promise not found. Ensure firebase-client.js loads before dashboard.js.");
     // Display a critical error
     const errorDiv = document.getElementById('error-message') || document.body;
     errorDiv.textContent = "A critical application file (firebase-client.js) failed to load correctly. Please refresh the page or contact support.";
     errorDiv.classList.remove('hidden');
} 