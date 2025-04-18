console.log('[Medications Frontend] Script start.'); // Log script start

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Medications Frontend] DOMContentLoaded event fired.'); // Log DOM ready
    const medicationsContentArea = document.getElementById('medications-content-area'); // Adjust ID if needed
    const loadingIndicator = document.getElementById('medications-loading'); // Adjust ID if needed
    const errorContainer = document.getElementById('medications-error'); // Adjust ID if needed
    const interactionResultsArea = document.getElementById('interaction-results'); // Adjust ID if needed
    const checkInteractionsButton = document.getElementById('check-interactions-btn'); // Adjust ID if needed

    if (!medicationsContentArea) {
        console.error('Medications content area not found. Ensure an element with ID "medications-content-area" exists.');
        return;
    }
    if (!checkInteractionsButton) {
        console.warn('Check Interactions button not found.');
    }
    if (!interactionResultsArea) {
        console.warn('Interaction results area not found.');
    }

    async function loadMedications() {
        console.log('[Medications Frontend] loadMedications function called.'); // Log function entry
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        if (errorContainer) errorContainer.classList.add('hidden');
        medicationsContentArea.innerHTML = ''; // Clear previous content
        if(interactionResultsArea) interactionResultsArea.innerHTML = ''; // Clear previous results
        if(checkInteractionsButton) checkInteractionsButton.disabled = true; // Disable button initially

        try {
            const apiUrl = '/api/documents/medications/all'; // Define URL
            console.log(`[Medications Frontend FINAL CHECK] Preparing to fetch from URL: ${apiUrl}`); // FINAL CHECK LOG
            const response = await fetch(apiUrl);
            console.log(`[Medications Frontend FINAL CHECK] Fetch response status: ${response.status} for URL: ${response.url}`); // Log status and final URL
            
            if (!response.ok) {
                 console.error(`[Medications Frontend FINAL CHECK] Fetch failed with status: ${response.status}`);
                const errorText = await response.text(); // Get raw text for 404
                console.error('[Medications Frontend FINAL CHECK] Raw error response text:', errorText);
                let errorMsg = `HTTP error! status: ${response.status}`;
                try { 
                    const errorData = JSON.parse(errorText); 
                    errorMsg = errorData.error || errorMsg;
                } catch(e) { /* Ignore if not JSON */ }
                throw new Error(errorMsg);
            }
            
            const result = await response.json();
             console.log('[Medications Frontend FINAL CHECK] Fetch successful, result keys:', Object.keys(result));
            
            if (result.success && result.medications) {
                console.log('[Medications Frontend FINAL CHECK] Rendering medication list.');
                renderMedicationList(result.medications);
            } else {
                 console.error('[Medications Frontend FINAL CHECK] API call successful but data is missing or success=false.');
                throw new Error(result.error || 'Failed to fetch medications properly.');
            }

        } catch (error) {
            console.error('[Medications Frontend FINAL CHECK] Error caught in loadMedications function:', error.message, error.stack);
            if (errorContainer) {
                errorContainer.textContent = `Error loading medications: ${error.message}`;
                errorContainer.classList.remove('hidden');
            }
            medicationsContentArea.innerHTML = '<p class="text-red-600">Could not load medication list.</p>';
        } finally {
             console.log('[Medications Frontend FINAL CHECK] loadMedications finally block reached.');
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
        }
    }

    function renderMedicationList(medications) {
        if (!medications || medications.length === 0) {
            medicationsContentArea.innerHTML = '<p class="text-gray-500">No medications found in your processed documents.</p>';
             if(checkInteractionsButton) checkInteractionsButton.classList.add('hidden'); // Hide button if no meds
            return;
        }
        
        if(checkInteractionsButton) checkInteractionsButton.classList.remove('hidden'); // Show button
        
        let listHtml = '<div class="space-y-4">';
        
        medications.forEach((med, index) => {
            // Determine the display name using the established fallback logic
            let displayName = med.Name?.Generic || med.Name?.Brand || med.SuggestedName;
            let isNameExtracted = !!(med.Name?.Generic || med.Name?.Brand);
             if (!displayName) {
                displayName = `Medication Entry #${index + 1}`;
                isNameExtracted = false;
            }
            const nameStyleClass = isNameExtracted ? 'font-semibold text-lg text-gray-900' : 'font-semibold text-lg text-gray-700 italic';
            
            // Visual indicators for general knowledge data
            const instructionIndicator = med.isGeneralKnowledgeInstructions ? 
                '<span class="text-xs font-medium text-blue-600 ml-2" title="Added from general drug knowledge">(General Info)</span>' : '';
            const sideEffectIndicator = med.isGeneralKnowledgeSideEffects ? 
                '<span class="text-xs font-medium text-blue-600 ml-2" title="Added from general drug knowledge">(General Info)</span>' : '';

            listHtml += `
                <div class="bg-white p-4 rounded-lg shadow border border-gray-200 flex items-start space-x-4">
                    <input type="checkbox" id="med-checkbox-${index}" value="${displayName}" class="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 medication-checkbox">
                    <div class="flex-grow">
                        <label for="med-checkbox-${index}" class="${nameStyleClass} cursor-pointer">${displayName}</label>
                        <dl class="mt-2 grid grid-cols-1 gap-y-1 text-sm text-gray-700 sm:grid-cols-2 sm:gap-x-4">
                            ${med.Dosage ? `<div class="sm:col-span-1"><dt class="font-medium text-gray-500">Dosage:</dt> <dd>${med.Dosage}</dd></div>` : ''}
                            ${med.Frequency ? `<div class="sm:col-span-1"><dt class="font-medium text-gray-500">Frequency:</dt> <dd>${med.Frequency}</dd></div>` : ''}
                            ${med.Purpose ? `<div class="sm:col-span-2"><dt class="font-medium text-gray-500">Purpose:</dt> <dd>${med.Purpose}</dd></div>` : ''}
                            ${med['Special Instructions'] ? `<div class="sm:col-span-2"><dt class="font-medium text-gray-500">Instructions ${instructionIndicator}:</dt> <dd>${med['Special Instructions']}</dd></div>` : ''}
                            ${med['Important Side Effects'] ? `<div class="sm:col-span-2"><dt class="font-medium text-red-600">Warnings ${sideEffectIndicator}:</dt> <dd class="text-red-700">${med['Important Side Effects']}</dd></div>` : ''}
                            ${med.sourceDocumentName ? `<div class="sm:col-span-2 mt-1"><dt class="text-xs text-gray-400">Source:</dt> <dd class="text-xs text-gray-400">${med.sourceDocumentName}</dd></div>` : ''}
                         </dl>
                    </div>
                </div>
            `;
        });
        
        listHtml += '</div>';
        medicationsContentArea.innerHTML = listHtml;
        
        // Add event listener to checkboxes to enable/disable button
        addCheckboxListeners();
    }

    function addCheckboxListeners() {
       const checkboxes = document.querySelectorAll('.medication-checkbox');
        if (checkInteractionsButton) {
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const selectedCount = document.querySelectorAll('.medication-checkbox:checked').length;
                    checkInteractionsButton.disabled = selectedCount < 2; // Enable button if 2 or more are selected
                });
            });
             // Initial check
             const selectedCount = document.querySelectorAll('.medication-checkbox:checked').length;
             checkInteractionsButton.disabled = selectedCount < 2;
        } 
    }

    // Placeholder for interaction check function
    async function checkInteractions() {
        const selectedCheckboxes = document.querySelectorAll('.medication-checkbox:checked');
        const selectedMedicationNames = Array.from(selectedCheckboxes).map(cb => cb.value);

        if (selectedMedicationNames.length < 2) {
            alert('Please select at least two medications to check for interactions.');
            return;
        }
        
        console.log('Checking interactions for:', selectedMedicationNames);
        if (interactionResultsArea) interactionResultsArea.innerHTML = '<p class="text-gray-500 italic">Checking interactions...</p>';
        if (checkInteractionsButton) checkInteractionsButton.disabled = true; // Disable while checking

        // --- Implement API Call --- 
        try {
            const response = await fetch('/api/medications/check-interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ medications: selectedMedicationNames })
            });
            const result = await response.json();
            if (result.success && result.analysis) {
                 displayInteractionResults(result.analysis);
            } else { 
                 throw new Error(result.error || 'Interaction check failed to return analysis.');
            }
        } catch (error) {
            console.error('Interaction check error:', error);
            if (interactionResultsArea) interactionResultsArea.innerHTML = `<p class="text-red-600">Error checking interactions: ${error.message}</p>`;
        } finally {
            // Re-enable button based on current selection, even after error/success
            if (checkInteractionsButton) {
                const selectedCount = document.querySelectorAll('.medication-checkbox:checked').length;
                checkInteractionsButton.disabled = selectedCount < 2; 
            }
        }
        // --- End API Call ---
    }
    
    function displayInteractionResults(analysis) {
        // --- Render analysis results --- 
        if (interactionResultsArea) {
            // Basic styling based on risk level (customize colors as needed)
            let riskColorClass = 'text-gray-700';
            let riskBgClass = 'bg-gray-100';
            const riskLevelLower = analysis.riskLevel?.toLowerCase() || 'unknown';

            if (riskLevelLower === 'severe' || riskLevelLower === 'high') {
                riskColorClass = 'text-red-800';
                riskBgClass = 'bg-red-100';
            } else if (riskLevelLower === 'medium') {
                riskColorClass = 'text-yellow-800';
                riskBgClass = 'bg-yellow-100';
            } else if (riskLevelLower === 'low') {
                riskColorClass = 'text-blue-800';
                riskBgClass = 'bg-blue-100';
            } else { // None or Unknown
                 riskColorClass = 'text-green-800';
                 riskBgClass = 'bg-green-100';
            }

             interactionResultsArea.innerHTML = `
                 <div class="mt-6 p-4 ${riskBgClass} rounded-lg border border-gray-200">
                     <h3 class="text-lg font-semibold mb-2 ${riskColorClass}">Interaction Results</h3>
                     <p class="mb-1"><strong class="font-medium">Risk Level:</strong> <span class="font-semibold ${riskColorClass}">${analysis.riskLevel || 'Unknown'}</span></p>
                     <p><strong class="font-medium">Details:</strong></p>
                     <p class="text-gray-800 whitespace-pre-wrap">${analysis.description || 'No details provided.'}</p> 
                 </div>
             `;
        }
    }

    console.log('[Medications Frontend] Adding event listeners and calling initial loadMedications.');
    // Add event listener to the button
    if (checkInteractionsButton) {
        checkInteractionsButton.addEventListener('click', checkInteractions);
    }

    // Initial load when the script runs (assuming it's loaded when the tab becomes active)
    // In a real SPA, you'd trigger this when the Medications tab is clicked/routed to.
    loadMedications(); 
}); 