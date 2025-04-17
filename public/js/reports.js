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
    
    // Fetch user's reports
    try {
        console.log('Making API request to /api/documents/reports');
        const response = await fetch('/api/documents/reports');
        console.log('API response status:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('Response not OK:', response);
            throw new Error('Failed to fetch reports');
        }
        
        console.log('Parsing JSON response...');
        const data = await response.json();
        console.log('Received data:', data);
        
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
        loadingPlaceholder.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }
    
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