document.addEventListener('DOMContentLoaded', async function() {
    const reportsList = document.getElementById('reports-list');
    const loadingPlaceholder = document.getElementById('loading-placeholder');
    const emptyState = document.getElementById('empty-state');
    const reportsContainer = document.getElementById('reports-container');
    const reportTemplate = document.getElementById('report-card-template');
    
    console.log('Reports page loaded, attempting to fetch reports...');
    
    // First test API connectivity
    try {
        console.log('Testing API connectivity with /api/documents/test');
        const testResponse = await fetch('/api/documents/test');
        console.log('Test API response:', testResponse.status, testResponse.statusText);
        const testData = await testResponse.json();
        console.log('Test endpoint data:', testData);
    } catch (testError) {
        console.error('Test API request failed:', testError);
    }
    
    // Cache constants
    const REPORTS_CACHE_KEY = 'rxplain_reports_cache';
    const CACHE_EXPIRY_KEY = 'rxplain_reports_cache_expiry';
    const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Check if we have cached reports that aren't expired
    async function fetchReports() {
        // Try to get cached data first
        const cachedData = localStorage.getItem(REPORTS_CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
        const now = new Date().getTime();
        
        // If we have valid cached data that isn't expired, use it
        if (cachedData && cacheExpiry && now < parseInt(cacheExpiry)) {
            console.log('Using cached reports data');
            try {
                return JSON.parse(cachedData);
            } catch (e) {
                console.error('Error parsing cached data:', e);
                // If there's an error parsing, we'll fetch fresh data
            }
        }
        
        // If no cache or expired, fetch from server
        console.log('Cache expired or not found, making API request to /api/documents/reports');
        const response = await fetch('/api/documents/reports');
        console.log('API response status:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('Response not OK:', response);
            throw new Error('Failed to fetch reports');
        }
        
        console.log('Parsing JSON response...');
        const data = await response.json();
        console.log('Received data:', data);
        
        // Save to cache if successful
        if (data.success && data.reports) {
            try {
                localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(data));
                localStorage.setItem(CACHE_EXPIRY_KEY, (now + CACHE_DURATION).toString());
                console.log('Saved reports data to cache, expires in 1 hour');
            } catch (e) {
                console.warn('Failed to cache reports data:', e);
            }
        }
        
        return data;
    }
    
    // Main function to load reports
    async function loadReports() {
        try {
            const data = await fetchReports();
            
            if (data.success && data.reports) {
                const reports = data.reports;
                console.log('Found', reports.length, 'reports');
                
                // Hide loading and show content
                loadingPlaceholder.classList.add('hidden');
                
                if (reports.length === 0) {
                    console.log('No reports found, showing empty state');
                    emptyState.classList.remove('hidden');
                } else {
                    console.log('Rendering reports to the page');
                    reportsContainer.classList.remove('hidden');
                    renderReports(reports);
                }
            } else {
                console.error('Invalid response data structure:', data);
                throw new Error('Invalid response data');
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            console.error('Error details:', error.message, error.stack);
            
            // If there's an error, try to use cached data regardless of expiry
            try {
                const emergencyCachedData = localStorage.getItem(REPORTS_CACHE_KEY);
                if (emergencyCachedData) {
                    console.log('Attempting to use expired cache due to fetch error');
                    const parsedCache = JSON.parse(emergencyCachedData);
                    if (parsedCache.success && parsedCache.reports) {
                        loadingPlaceholder.classList.add('hidden');
                        if (parsedCache.reports.length === 0) {
                            emptyState.classList.remove('hidden');
                        } else {
                            reportsContainer.classList.remove('hidden');
                            renderReports(parsedCache.reports);
                            // Show a notice that we're using cached data
                            showCacheNotice();
                            return;
                        }
                    }
                }
            } catch (cacheError) {
                console.error('Failed to use emergency cached data:', cacheError);
            }
            
            // If all else fails, show the empty state
            loadingPlaceholder.classList.add('hidden');
            emptyState.classList.remove('hidden');
        }
    }
    
    // Function to show a notice that we're using cached data
    function showCacheNotice() {
        const notice = document.createElement('div');
        notice.className = 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded';
        notice.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm">
                        Showing cached reports. Some information may be outdated.
                        <button id="refresh-reports" class="font-medium underline ml-2">Refresh</button>
                    </p>
                </div>
            </div>
        `;
        reportsContainer.parentNode.insertBefore(notice, reportsContainer);
        
        // Add refresh functionality
        document.getElementById('refresh-reports').addEventListener('click', function() {
            // Clear cache and reload
            localStorage.removeItem(REPORTS_CACHE_KEY);
            localStorage.removeItem(CACHE_EXPIRY_KEY);
            location.reload();
        });
    }
    
    // Add a function to manually clear the cache (useful for development)
    window.clearReportsCache = function() {
        localStorage.removeItem(REPORTS_CACHE_KEY);
        localStorage.removeItem(CACHE_EXPIRY_KEY);
        console.log('Reports cache cleared');
    };
    
    // Start loading reports
    loadReports();
    
    // Render reports to the page
    function renderReports(reports) {
        reportsContainer.innerHTML = '';
        
        if (reports.length === 0) {
            reportsContainer.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }
        
        reportsContainer.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        reports.forEach(report => {
            const card = document.importNode(reportTemplate.content, true);
            
            // Set report data
            card.querySelector('.report-title').textContent = report.title || 'Untitled Report';
            
            // Format creation date with error handling
            let createdDate = 'Date unavailable';
            try {
                if (report.createdAt) {
                    const date = new Date(report.createdAt);
                    // Verify the date is valid
                    if (!isNaN(date.getTime())) {
                        createdDate = date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
            } catch (e) {
                console.warn('Error formatting date:', e);
            }
            card.querySelector('.report-date').textContent = `Created on ${createdDate}`;
            
            // Document count
            const docCount = report.sourceDocuments ? report.sourceDocuments.length : 0;
            card.querySelector('.report-documents').textContent = `${docCount} document${docCount !== 1 ? 's' : ''}`;
            
            // Medication count
            const medCount = report.medications ? report.medications.length : 0;
            card.querySelector('.report-medications').textContent = `${medCount} medication${medCount !== 1 ? 's' : ''}`;
            
            // Add document badges
            const docBadgesContainer = card.querySelector('.document-badges');
            if (report.documentNames && report.documentNames.length > 0) {
                report.documentNames.forEach(docName => {
                    const badge = document.createElement('span');
                    badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
                    badge.textContent = docName.length > 25 ? docName.substring(0, 22) + '...' : docName;
                    docBadgesContainer.appendChild(badge);
                });
            }
            
            // Set view link
            const viewBtn = card.querySelector('.view-report-btn');
            viewBtn.href = `/reports/${report.id}`;
            
            reportsContainer.appendChild(card);
        });
    }
}); 