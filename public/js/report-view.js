document.addEventListener('DOMContentLoaded', function() {
    // Cache constants
    const REPORT_CACHE_PREFIX = 'rxplain_report_';
    const REPORT_CACHE_EXPIRY_PREFIX = 'rxplain_report_expiry_';
    const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Get the report ID from the URL
    const reportId = window.location.pathname.split('/').pop();
    
    // Print report
    document.getElementById('print-report').addEventListener('click', function() {
        window.print();
    });
    
    // Download as PDF - This is a placeholder that would need to be implemented with a PDF generation library
    document.getElementById('download-report').addEventListener('click', function() {
        alert('This feature requires server-side PDF generation, which would be implemented in a production environment.');
    });
    
    // Cache the current report data for future views
    function cacheCurrentReport() {
        try {
            // Extract report data from the page
            const reportData = {
                id: reportId,
                title: document.querySelector('h1').textContent,
                content: document.querySelector('.prose').innerHTML,
                createdAt: document.querySelector('p.text-gray-600').textContent.replace('Created on ', '')
            };
            
            // Get medication data if available
            const medications = [];
            const medicationElements = document.querySelectorAll('.medication-name');
            medicationElements.forEach(element => {
                const card = element.closest('.bg-white');
                const name = element.textContent;
                
                // Try to get all the details from the card
                const details = {};
                card.querySelectorAll('.medication-detail').forEach(detail => {
                    const label = detail.querySelector('.medication-label').textContent.replace(':', '').toLowerCase();
                    const value = detail.querySelector('.medication-value').textContent;
                    details[label] = value;
                });
                
                // Add warnings if they exist
                const warningBox = card.querySelector('.warning-box');
                if (warningBox) {
                    details.warnings = warningBox.querySelector('.warning-content').textContent;
                }
                
                medications.push({
                    name,
                    ...details
                });
            });
            
            if (medications.length > 0) {
                reportData.medications = medications;
            }
            
            // Get source documents
            const sourceDocuments = [];
            document.querySelectorAll('.flex.flex-wrap.gap-2 > span').forEach(span => {
                sourceDocuments.push(span.textContent.trim());
            });
            
            if (sourceDocuments.length > 0) {
                reportData.documentNames = sourceDocuments;
            }
            
            // Store in localStorage with expiry
            const now = new Date().getTime();
            localStorage.setItem(`${REPORT_CACHE_PREFIX}${reportId}`, JSON.stringify(reportData));
            localStorage.setItem(`${REPORT_CACHE_EXPIRY_PREFIX}${reportId}`, (now + CACHE_DURATION).toString());
            console.log(`Cached report ${reportId} for future visits (expires in 1 hour)`);
        } catch (error) {
            console.error('Error caching report data:', error);
        }
    }
    
    // Cache the current report after a short delay to ensure all content is loaded
    setTimeout(cacheCurrentReport, 1000);
    
    // Utility function to clear report cache (useful for development)
    window.clearReportCache = function(id = null) {
        if (id) {
            localStorage.removeItem(`${REPORT_CACHE_PREFIX}${id}`);
            localStorage.removeItem(`${REPORT_CACHE_EXPIRY_PREFIX}${id}`);
            console.log(`Cleared cache for report ${id}`);
        } else {
            // Clear all report caches
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(REPORT_CACHE_PREFIX) || key.startsWith(REPORT_CACHE_EXPIRY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            console.log('Cleared all report caches');
        }
    };
}); 