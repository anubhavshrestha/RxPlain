console.log('[Medications Frontend] Script start.'); // Log script start

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Medications Frontend] DOMContentLoaded event fired.'); // Log DOM ready
    
    // DOM Elements
    const medicationsContentArea = document.getElementById('medications-content');
    const filterInput = document.getElementById('medication-filter');
    const loadingIndicator = document.getElementById('loading-medications');
    const errorContainer = document.getElementById('error-container');
    
    // Interaction elements
    const checkInteractionsButton = document.getElementById('check-interactions-btn');
    const interactionResultsArea = document.getElementById('interaction-results');
    
    // Schedule elements
    const createScheduleButton = document.getElementById('create-schedule-btn');
    const scheduleModal = document.getElementById('schedule-modal');
    const closeScheduleBtn = document.getElementById('close-schedule-btn');
    const scheduleLoading = document.getElementById('schedule-loading');
    const scheduleContent = document.getElementById('schedule-content');
    const scheduleWarning = document.getElementById('schedule-warning');
    const warningInteractions = document.getElementById('warning-interactions');
    const consultDoctorBtn = document.getElementById('consult-doctor-btn');
    const continueAnywayBtn = document.getElementById('continue-anyway-btn');
    const saveScheduleBtn = document.getElementById('save-schedule-btn');
    const scheduleName = document.getElementById('schedule-name');
    const dailySchedule = document.getElementById('daily-schedule');
    const weeklyAdjustmentsSection = document.getElementById('weekly-adjustments-section');
    const weeklyAdjustments = document.getElementById('weekly-adjustments');
    const specialNotes = document.getElementById('special-notes');
    const followupRecommendation = document.getElementById('followup-recommendation');
    
    // Initialize
    fetchMedications();
    
    // Add filter functionality if available
    if (filterInput) {
        filterInput.addEventListener('input', filterMedications);
    }

    // Set up event listeners for scheduling
    if (closeScheduleBtn) {
        closeScheduleBtn.addEventListener('click', () => {
            scheduleModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        });
    }
    
    if (createScheduleButton) {
        createScheduleButton.addEventListener('click', createMedicationSchedule);
    }
    
    function fetchMedications() {
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        if (errorContainer) errorContainer.classList.add('hidden');
        if (medicationsContentArea) medicationsContentArea.innerHTML = '';
        
        console.log('[Medications Frontend] Fetching medications from API');
        
        fetch('/api/documents/medications/all')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (loadingIndicator) loadingIndicator.classList.add('hidden');
                
                if (data.medications && Array.isArray(data.medications)) {
                    if (data.medications.length === 0) {
                        // No medications found
                        if (medicationsContentArea) {
                            medicationsContentArea.innerHTML = `
                                <div class="text-center py-8">
                                    <p class="text-gray-500 mb-4">No medications found.</p>
                                    <p class="text-sm">Upload medical documents to extract medications automatically.</p>
                                </div>
                            `;
                        }
                    } else {
                        // Render medications
                        renderMedicationList(data.medications);
                    }
                } else {
                    throw new Error('Invalid data format received from API');
                }
            })
            .catch(error => {
                console.error('[Medications Frontend] Error fetching medications:', error);
                if (loadingIndicator) loadingIndicator.classList.add('hidden');
                if (errorContainer) {
                    errorContainer.classList.remove('hidden');
                    errorContainer.innerHTML = `<p>Error loading medications: ${error.message}</p>`;
                }
            });
    }
    
    function renderMedicationList(medications) {
        if (!medications || medications.length === 0) {
            if (medicationsContentArea) {
                medicationsContentArea.innerHTML = '<p class="text-gray-500">No medications found.</p>';
            }
            return;
        }
        
        if (!medicationsContentArea) return;
        
        let listHtml = '<div class="space-y-4">';
        
        medications.forEach((med, index) => {
            // Determine the display name using the established fallback logic
            const displayName = med.Name?.Generic || med.Name?.Brand || med.SuggestedName || med.name || 'Unnamed Medication';
            
            // Special styling for suggested names (which means it was inferred, not explicitly found)
            const nameStyleClass = med.SuggestedName ? 'text-gray-700 italic' : 'text-gray-900 font-medium';
            
            // Indicate if instructions or side effects were supplemented by AI knowledge
            const instructionIndicator = med.isGeneralKnowledgeInstructions ? 
                '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">AI</span>' : '';
            
            const sideEffectIndicator = med.isGeneralKnowledgeSideEffects ? 
                '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">AI</span>' : '';

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
        if (checkInteractionsButton || createScheduleButton) {
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const selectedCount = document.querySelectorAll('.medication-checkbox:checked').length;
                    // For interaction button, need at least 2 selected
                    if (checkInteractionsButton) {
                        checkInteractionsButton.disabled = selectedCount < 2;
                        
                        // Update counter
                        const countDisplay = document.getElementById('selected-count');
                        if (countDisplay) {
                            if (selectedCount > 0) {
                                countDisplay.textContent = selectedCount;
                                countDisplay.classList.remove('hidden');
                            } else {
                                countDisplay.classList.add('hidden');
                            }
                        }
                    }
                    
                    // For schedule button, need at least 1 selected
                    if (createScheduleButton) {
                        createScheduleButton.disabled = selectedCount < 1;
                        
                        // Update counter
                        const countDisplay = document.getElementById('schedule-selected-count');
                        if (countDisplay) {
                            if (selectedCount > 0) {
                                countDisplay.textContent = selectedCount;
                                countDisplay.classList.remove('hidden');
                            } else {
                                countDisplay.classList.add('hidden');
                            }
                        }
                    }
                });
            });
            
            // Initial check
            const selectedCount = document.querySelectorAll('.medication-checkbox:checked').length;
            if (checkInteractionsButton) {
                checkInteractionsButton.disabled = selectedCount < 2;
            }
            if (createScheduleButton) {
                createScheduleButton.disabled = selectedCount < 1;
            }
        } 
    }
    
    function filterMedications() {
        if (!filterInput || !medicationsContentArea) return;
        
        const filterValue = filterInput.value.toLowerCase();
        const medicationCards = medicationsContentArea.querySelectorAll('div > div');
        
        medicationCards.forEach(card => {
            const medicationName = card.querySelector('label').textContent.toLowerCase();
            const purposeElement = card.querySelector('dt.font-medium:contains("Purpose:")');
            const purpose = purposeElement ? purposeElement.nextElementSibling.textContent.toLowerCase() : '';
            
            if (medicationName.includes(filterValue) || purpose.includes(filterValue)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
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
    fetchMedications(); 

    // Schedule creation function
    async function createMedicationSchedule() {
        const selectedCheckboxes = document.querySelectorAll('.medication-checkbox:checked');
        const selectedMedicationNames = Array.from(selectedCheckboxes).map(cb => cb.value);

        if (selectedMedicationNames.length < 1) {
            alert('Please select at least one medication to schedule.');
            return;
        }
        
        console.log('Creating schedule for:', selectedMedicationNames);
        
        // Show modal with loading state
        resetScheduleModal();
        scheduleModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden'); // Prevent scrolling
        scheduleLoading.classList.remove('hidden');
        scheduleContent.classList.add('hidden');
        scheduleWarning.classList.add('hidden');
        
        // Default name
        const today = new Date();
        scheduleName.value = `Medication Schedule (${today.toLocaleDateString()})`;
        
        // Call API to generate schedule
        try {
            const response = await fetch('/api/documents/medications/generate-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ medications: selectedMedicationNames })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Hide loading
            scheduleLoading.classList.add('hidden');
            
            // Check if there are severe interactions that require warning
            if (result.success && result.requiresWarning && result.interactions) {
                // Show warning
                scheduleWarning.classList.remove('hidden');
                
                // Populate warning details
                warningInteractions.innerHTML = '';
                result.interactions.forEach(interaction => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span class="font-medium">${interaction.pair.join(' + ')}:</span> ${interaction.warning}`;
                    warningInteractions.appendChild(li);
                });
                
                // Set up warning buttons
                consultDoctorBtn.onclick = () => {
                    scheduleModal.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden');
                };
                
                continueAnywayBtn.onclick = () => {
                    // Hide warning and proceed to generate schedule
                    scheduleWarning.classList.add('hidden');
                    scheduleLoading.classList.remove('hidden');
                    
                    // Call API again but force schedule generation
                    fetch('/api/documents/medications/generate-schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            medications: selectedMedicationNames,
                            ignoreWarnings: true 
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        scheduleLoading.classList.add('hidden');
                        if (data.success && data.schedule) {
                            displaySchedule(data.schedule);
                        } else {
                            throw new Error(data.error || 'Failed to generate schedule');
                        }
                    })
                    .catch(error => {
                        scheduleLoading.classList.add('hidden');
                        alert(`Error generating schedule: ${error.message}`);
                    });
                };
            }
            // Show schedule if available and no warnings
            else if (result.success && result.schedule) {
                displaySchedule(result.schedule);
            } else {
                throw new Error(result.error || 'Failed to generate schedule');
            }
        } catch (error) {
            console.error('Error generating schedule:', error);
            scheduleLoading.classList.add('hidden');
            alert(`Error generating schedule: ${error.message}`);
        }
    }
    
    function displaySchedule(scheduleData) {
        // Show content area
        scheduleContent.classList.remove('hidden');
        
        // Populate schedule name if not already set by user
        if (!scheduleName.value) {
            scheduleName.value = scheduleData.name || `Medication Schedule (${new Date().toLocaleDateString()})`;
        }
        
        // Populate daily schedule
        dailySchedule.innerHTML = '';
        if (scheduleData.schedule && scheduleData.schedule.dailySchedule) {
            scheduleData.schedule.dailySchedule.forEach(timeSlot => {
                const timeSlotElement = document.createElement('div');
                timeSlotElement.className = 'bg-white border border-blue-100 rounded-lg p-4 shadow-sm';
                
                const headerClass = 'flex items-center justify-between border-b border-blue-100 pb-2 mb-3';
                const timeLabel = `${timeSlot.timeOfDay} <span class="text-blue-700 text-sm font-normal">(${timeSlot.suggestedTime})</span>`;
                const foodBadge = timeSlot.withFood 
                    ? '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">With Food</span>'
                    : '<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Empty Stomach</span>';
                
                let medsHtml = '';
                timeSlot.medications.forEach(med => {
                    medsHtml += `
                        <div class="py-2 border-b border-gray-100 last:border-0">
                            <div class="font-medium text-gray-900">${med.name}</div>
                            <div class="text-sm text-gray-700 mt-1 flex flex-wrap gap-2">
                                ${med.dosage ? `<span class="bg-gray-100 px-2 py-1 rounded-md">${med.dosage}</span>` : ''}
                                ${med.specialInstructions ? `<span class="text-blue-700">${med.specialInstructions}</span>` : ''}
                            </div>
                        </div>
                    `;
                });
                
                timeSlotElement.innerHTML = `
                    <div class="${headerClass}">
                        <h5 class="text-md font-medium text-gray-900">${timeLabel}</h5>
                        ${foodBadge}
                    </div>
                    <div class="divide-y divide-gray-100">
                        ${medsHtml}
                    </div>
                `;
                
                dailySchedule.appendChild(timeSlotElement);
            });
        }
        
        // Populate weekly adjustments if any
        if (scheduleData.schedule && scheduleData.schedule.weeklyAdjustments && scheduleData.schedule.weeklyAdjustments.length > 0) {
            weeklyAdjustmentsSection.classList.remove('hidden');
            weeklyAdjustments.innerHTML = '';
            
            scheduleData.schedule.weeklyAdjustments.forEach(adjustment => {
                const item = document.createElement('div');
                item.className = 'p-3 bg-gray-50 rounded-lg';
                item.innerHTML = `
                    <div class="font-medium text-gray-800">${adjustment.day}</div>
                    <div class="text-sm text-gray-700 mt-1">${adjustment.adjustments}</div>
                `;
                weeklyAdjustments.appendChild(item);
            });
        } else {
            weeklyAdjustmentsSection.classList.add('hidden');
        }
        
        // Set special notes
        if (scheduleData.schedule && scheduleData.schedule.specialNotes) {
            specialNotes.textContent = scheduleData.schedule.specialNotes;
        }
        
        // Set followup recommendation
        if (scheduleData.schedule && scheduleData.schedule.recommendedFollowup) {
            followupRecommendation.textContent = scheduleData.schedule.recommendedFollowup;
        }
        
        // Set up save button
        saveScheduleBtn.onclick = () => saveSchedule(scheduleData);
    }
    
    function saveSchedule(scheduleData) {
        // Update name from input
        const customName = scheduleName.value.trim();
        if (customName) {
            scheduleData.name = customName;
        }
        
        // Call API to save/update schedule
        fetch(`/api/documents/med-schedules/${scheduleData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: scheduleData.name,
                active: true
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Schedule saved successfully!');
                scheduleModal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
                
                // Optionally redirect to a schedules page
                // window.location.href = '/medication-schedules';
            } else {
                throw new Error(result.error || 'Failed to save schedule');
            }
        })
        .catch(error => {
            console.error('Error saving schedule:', error);
            alert(`Error saving schedule: ${error.message}`);
        });
    }
    
    function resetScheduleModal() {
        // Reset all values in the modal
        scheduleName.value = '';
        dailySchedule.innerHTML = '';
        weeklyAdjustments.innerHTML = '';
        weeklyAdjustmentsSection.classList.add('hidden');
        specialNotes.textContent = 'Please consult your healthcare provider before following this schedule.';
        followupRecommendation.textContent = 'Schedule a follow-up with your doctor to review this medication plan.';
        scheduleWarning.classList.add('hidden');
        warningInteractions.innerHTML = '';
    }
}); 