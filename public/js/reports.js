document.addEventListener('DOMContentLoaded', async function() {
    console.log('[Reports.js] DOMContentLoaded triggered.');

    // --- DOM Element Checks --- 
    const reportsList = document.getElementById('reports-list'); // Note: This might not be used anymore?
    const loadingPlaceholder = document.getElementById('loading-placeholder');
    const emptyState = document.getElementById('empty-state');
    const reportsContainer = document.getElementById('reports-container');
    const reportTemplate = document.getElementById('report-card-template');
    const cacheNoticeContainer = document.getElementById('cache-notice-container');

    const requiredElements = {
        loadingPlaceholder, 
        emptyState, 
        reportsContainer, 
        reportTemplate, 
        cacheNoticeContainer 
    };

    for (const [key, element] of Object.entries(requiredElements)) {
        if (!element) {
            console.error(`[Reports.js] CRITICAL ERROR: DOM element '#${key}' not found. Aborting script.`);
            // Optionally display an error message to the user here
            if(emptyState) { // Try to show error in empty state if possible
                emptyState.innerHTML = '<p class="text-red-600">Error: UI components failed to load. Please contact support.</p>';
                emptyState.classList.remove('hidden');
                if(loadingPlaceholder) loadingPlaceholder.classList.add('hidden');
                if(reportsContainer) reportsContainer.classList.add('hidden');
            }
            return; // Stop execution
        }
    }
    console.log('[Reports.js] All required DOM elements found.');

    // --- End DOM Element Checks ---
    
    console.log('[Reports.js] Attempting to fetch reports...');
    
    // First test API connectivity (Keep this)
    try {
        console.log('[Reports.js] Testing API connectivity with /api/documents/test');
        const testResponse = await fetch('/api/documents/test');
        console.log('[Reports.js] Test API response status:', testResponse.status);
        const testData = await testResponse.json();
        console.log('[Reports.js] Test endpoint data:', testData);
    } catch (testError) {
        console.error('[Reports.js] Test API request failed:', testError);
    }
    
    // Cache constants
    const REPORTS_CACHE_KEY = 'rxplain_reports_cache';
    const CACHE_EXPIRY_KEY = 'rxplain_reports_cache_expiry';
    const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
    
    let currentlyDisplayedReports = [];

    // Function to load reports from cache IF available and valid
    function loadReportsFromCache() {
        console.log('[Reports.js] Entering loadReportsFromCache...');
        const cachedData = localStorage.getItem(REPORTS_CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
        const now = new Date().getTime();
        console.log(`[Reports.js] Cache check: now=${now}, expiry=${cacheExpiry}`);

        if (cachedData && cacheExpiry && now < parseInt(cacheExpiry)) {
            console.log('[Reports.js] Cache HIT and VALID. Attempting to parse.');
            try {
                const parsedData = JSON.parse(cachedData);
                console.log('[Reports.js] Parsed cached data:', parsedData);
                if (parsedData.success && Array.isArray(parsedData.reports)) {
                    console.log('[Reports.js] Cached data structure valid. Using cache.');
                    currentlyDisplayedReports = parsedData.reports;
                    renderReports(currentlyDisplayedReports); // Render immediately
                    loadingPlaceholder.classList.add('hidden');
                    console.log('[Reports.js] Exiting loadReportsFromCache (used cache).');
                    return true; // Indicate cache was used
                } else {
                    console.warn('[Reports.js] Cached data structure invalid. Clearing cache.', parsedData);
                    clearReportsCache(false); // Clear invalid cache without reloading
                }
            } catch (e) {
                console.error('[Reports.js] Error parsing cached data. Clearing cache.', e);
                clearReportsCache(false); // Clear corrupted cache without reloading
            }
        } else if (cachedData) {
             console.log('[Reports.js] Cache HIT but EXPIRED.');
        } else {
             console.log('[Reports.js] Cache MISS.');
        }
        console.log('[Reports.js] Exiting loadReportsFromCache (did NOT use cache).');
        return false; // Indicate cache was not used or was invalid/expired
    }

    // Function to fetch reports from the server
    async function fetchReportsFromServer() {
        console.log('[Reports.js] Entering fetchReportsFromServer...');
        const fetchUrl = '/api/documents/reports';
        console.log(`[Reports.js] Fetching from: ${fetchUrl}`);
        try {
            const response = await fetch(fetchUrl);
            console.log(`[Reports.js] API response status: ${response.status} ${response.statusText}`);
            
            // Try to get raw text first for debugging
            const rawText = await response.text();
            console.log('[Reports.js] Raw API response text:', rawText);

            if (!response.ok) {
                console.error('[Reports.js] Response not OK. Raw text:', rawText);
                throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
            }

            // Now parse the text we already retrieved
            const data = JSON.parse(rawText);
            console.log('[Reports.js] Parsed data from server:', data);

            if (data.success && Array.isArray(data.reports)) {
                console.log(`[Reports.js] Successfully fetched ${data.reports.length} reports from server.`);
                console.log('[Reports.js] Exiting fetchReportsFromServer (success).');
                return data.reports; // Return just the reports array
            } else {
                console.error('[Reports.js] Invalid response data structure from server:', data);
                throw new Error('Invalid response data structure from server');
            }
        } catch (error) {
            console.error('[Reports.js] Error during fetchReportsFromServer:', error);
            console.log('[Reports.js] Exiting fetchReportsFromServer (error).');
            throw error; // Re-throw to be caught by the caller
        }
    }
    
    // Function to compare report lists (simple comparison based on IDs)
    function areReportListsDifferent(listA, listB) {
        console.log(`[Reports.js] Comparing report lists. List A length: ${listA.length}, List B length: ${listB.length}`);
        if (listA.length !== listB.length) {
             console.log('[Reports.js] Lists have different lengths. Result: true');
            return true;
        }
        const idsA = new Set(listA.map(r => r.id));
        const idsB = new Set(listB.map(r => r.id));
        console.log('[Reports.js] List A IDs:', Array.from(idsA));
        console.log('[Reports.js] List B IDs:', Array.from(idsB));
        if (idsA.size !== idsB.size) { // Should be redundant but safe check
             console.log('[Reports.js] ID sets have different sizes. Result: true');
             return true; 
        }
        for (const id of idsA) {
            if (!idsB.has(id)) {
                 console.log(`[Reports.js] ID ${id} from List A not found in List B. Result: true`);
                return true;
            }
        }
        console.log('[Reports.js] Lists appear identical. Result: false');
        return false;
    }

    // Function to save data to cache
    function cacheReportsData(reports) {
        console.log(`[Reports.js] Attempting to cache ${reports.length} reports.`);
        const now = new Date().getTime();
        const dataToCache = { success: true, reports: reports };
        try {
            localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(dataToCache));
            localStorage.setItem(CACHE_EXPIRY_KEY, (now + CACHE_DURATION).toString());
            console.log('[Reports.js] Successfully updated reports cache.');
        } catch (e) {
            console.warn('[Reports.js] Failed to cache reports data:', e);
        }
    }

    // Main load and refresh logic
    async function initializeReportsDisplay() {
        console.log('[Reports.js] Entering initializeReportsDisplay...');
        const cacheUsed = loadReportsFromCache();
        console.log(`[Reports.js] Initial cache load result: cacheUsed = ${cacheUsed}`);

        if (!cacheUsed) {
            console.log('[Reports.js] Cache not used initially. Showing loading placeholder.');
            loadingPlaceholder.classList.remove('hidden');
            emptyState.classList.add('hidden');
            reportsContainer.classList.add('hidden');
        }

        // Always fetch fresh data in the background
        console.log('[Reports.js] Starting background fetch from server...');
        try {
            const freshReports = await fetchReportsFromServer();
            console.log(`[Reports.js] Background fetch successful. Received ${freshReports.length} reports.`);
            
            // If cache wasn't used initially, this is the first display
            if (!cacheUsed) {
                console.log('[Reports.js] Cache was not used initially. Rendering fresh data now.');
                currentlyDisplayedReports = freshReports;
                renderReports(currentlyDisplayedReports);
                loadingPlaceholder.classList.add('hidden'); // Hide loading now
            }
            // If cache *was* used, compare fresh data with displayed data
            else {
                 console.log('[Reports.js] Cache was used initially. Comparing fresh data with displayed data.');
                 if (areReportListsDifferent(currentlyDisplayedReports, freshReports)) {
                     console.log('[Reports.js] Server data differs from cache. Updating display.');
                     currentlyDisplayedReports = freshReports;
                     renderReports(currentlyDisplayedReports);
                     showUpdateNotice(); // Notify user of update
                 } else {
                     console.log('[Reports.js] Server data matches cache. No UI update needed.');
                 }
            }
            
            // Cache the fresh data regardless of whether UI was updated
            cacheReportsData(freshReports); 

        } catch (error) {
            console.error('[Reports.js] Background fetch failed:', error);
            // If the initial load depended on this fetch (no cache), show error/empty state
            if (!cacheUsed) {
                 console.log('[Reports.js] Background fetch failed AND cache was not used. Showing error state.');
                 loadingPlaceholder.classList.add('hidden');
                 reportsContainer.classList.add('hidden'); // Hide container 
                 emptyState.innerHTML = '<p class="text-red-600">Could not load reports. Please check your connection and try again.</p>';
                 emptyState.classList.remove('hidden'); 
                 // No need for showErrorNotice here as we replaced emptyState content
            } else {
                // If cache was already shown, show a non-blocking error notice
                console.log('[Reports.js] Background fetch failed, but cache was already displayed. Showing error notice.');
                showErrorNotice('Could not check for updated reports. Displaying previously loaded data.');
            }
        }
        console.log('[Reports.js] Exiting initializeReportsDisplay.');
    }

    // Function to show a notice that reports were updated
    function showUpdateNotice() {
        console.log('[Reports.js] Showing update notice.');
        if (!cacheNoticeContainer) {
            console.warn('[Reports.js] Cache notice container not found, cannot show update notice.');
            return;
        }
        cacheNoticeContainer.innerHTML = `
            <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 mb-4 rounded text-sm animate-pulse">
                Reports list has been updated.
            </div>
        `;
        // Optional: auto-hide after a few seconds
        setTimeout(() => {
             console.log('[Reports.js] Hiding update notice.');
             if(cacheNoticeContainer) cacheNoticeContainer.innerHTML = ''; 
        }, 5000);
    }
    
    // Function to show a general error notice
    function showErrorNotice(message) {
        console.log(`[Reports.js] Showing error notice: ${message}`);
        if (!cacheNoticeContainer) {
             console.warn('[Reports.js] Cache notice container not found, cannot show error notice.');
             return;
        }
         cacheNoticeContainer.innerHTML = `
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded text-sm">
                ${message}
            </div>
        `;
        // Maybe don't auto-hide errors?
    }

    // Add a function to manually clear the cache (useful for development)
    window.clearReportsCache = function(reload = true) {
        console.log('[Reports.js] Clearing reports cache...');
        localStorage.removeItem(REPORTS_CACHE_KEY);
        localStorage.removeItem(CACHE_EXPIRY_KEY);
        console.log('[Reports.js] Reports cache cleared.');
        if (reload) {
            console.log('[Reports.js] Reloading page.');
            location.reload(); 
        }
    };
    
    // Render reports to the page
    function renderReports(reports) {
        console.log(`[Reports.js] Entering renderReports with ${reports ? reports.length : 'null'} reports.`);
        
        // Clear previous content safely
        while (reportsContainer.firstChild) {
            reportsContainer.removeChild(reportsContainer.firstChild);
        }
        
        if (!reports || reports.length === 0) {
            console.log('[Reports.js] No reports to render. Showing empty state.');
            reportsContainer.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }
        
        console.log('[Reports.js] Rendering report cards...');
        reportsContainer.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        reports.forEach((report, index) => {
            console.log(`[Reports.js] Rendering report ${index + 1}:`, report);
            if (!reportTemplate || !reportTemplate.content) {
                 console.error('[Reports.js] Report template or template content not found. Cannot render report.');
                 return; // Skip this report
            }
            const card = document.importNode(reportTemplate.content, true);
            
            try {
                // Set report data
                const titleElement = card.querySelector('.report-title');
                if (titleElement) titleElement.textContent = report.title || 'Untitled Report';
                else console.warn('[Reports.js] .report-title element not found in template.');

                // Format creation date with error handling
                let createdDate = 'Date unavailable';
                try {
                    if (report.createdAt) {
                        const date = new Date(report.createdAt);
                        if (!isNaN(date.getTime())) {
                            createdDate = date.toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric', 
                                hour: '2-digit', minute: '2-digit'
                            });
                        } else {
                            console.warn(`[Reports.js] Invalid date format for report ${report.id}:`, report.createdAt);
                        }
                    }
                } catch (e) {
                    console.warn(`[Reports.js] Error formatting date for report ${report.id}:`, e);
                }
                const dateElement = card.querySelector('.report-date');
                if (dateElement) dateElement.textContent = `Created on ${createdDate}`;
                else console.warn('[Reports.js] .report-date element not found in template.');
                
                // Document count
                const docCount = Array.isArray(report.sourceDocuments) ? report.sourceDocuments.length : 0;
                const docCountElement = card.querySelector('.report-documents');
                if(docCountElement) docCountElement.textContent = `${docCount} document${docCount !== 1 ? 's' : ''}`;
                else console.warn('[Reports.js] .report-documents element not found in template.');
                
                // Medication count
                const medCount = Array.isArray(report.medications) ? report.medications.length : 0;
                 const medCountElement = card.querySelector('.report-medications');
                 if(medCountElement) medCountElement.textContent = `${medCount} medication${medCount !== 1 ? 's' : ''}`;
                 else console.warn('[Reports.js] .report-medications element not found in template.');
                
                // Add document badges
                const docBadgesContainer = card.querySelector('.document-badges');
                if (docBadgesContainer) {
                    docBadgesContainer.innerHTML = ''; // Clear first
                    if (Array.isArray(report.documentNames) && report.documentNames.length > 0) {
                        report.documentNames.forEach(docName => {
                            const badge = document.createElement('span');
                            badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-1 mb-1'; 
                            badge.textContent = docName.length > 25 ? docName.substring(0, 22) + '...' : docName;
                            badge.title = docName; // Add full name as tooltip
                            docBadgesContainer.appendChild(badge);
                        });
                    }
                } else {
                    console.warn('[Reports.js] .document-badges container not found in template.');
                }
                            
                // Set view link
                const viewBtn = card.querySelector('.view-report-btn');
                if(viewBtn) {
                    viewBtn.href = `/reports/${report.id}`;
                } else {
                     console.warn('[Reports.js] .view-report-btn element not found in template.');
                }

                // Append the fully constructed card
                reportsContainer.appendChild(card);
                console.log(`[Reports.js] Successfully appended card for report ${index + 1}.`);

            } catch (renderError) {
                console.error(`[Reports.js] Error rendering card for report ${index + 1}:`, report, renderError);
                // Optionally append an error placeholder for this card
            }
        });
         console.log('[Reports.js] Finished rendering all report cards.');
    }

    // Start the process
    console.log('[Reports.js] Calling initializeReportsDisplay...');
    initializeReportsDisplay();

}); 