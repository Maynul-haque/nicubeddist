const ALL_BED_DEFINITIONS = [
    { name: 'Blue 1', category: 'blue-ward-cabin', group: 'Blue Beds' }, { name: 'Blue 2', category: 'blue-ward-cabin', group: 'Blue Beds' },
    { name: 'Blue 3', category: 'blue-ward-cabin', group: 'Blue Beds' }, { name: 'Blue 4', category: 'blue-ward-cabin', group: 'Blue Beds' },
    { name: 'Blue 5', category: 'blue-ward-cabin', group: 'Blue Beds' }, { name: 'Blue 6', category: 'blue-ward-cabin', group: 'Blue Beds' },
    { name: 'Ward 1', category: 'blue-ward-cabin', group: 'Ward Beds' }, { name: 'Ward 2', category: 'blue-ward-cabin', group: 'Ward Beds' },
    { name: 'Ward 3', category: 'blue-ward-cabin', group: 'Ward Beds' }, { name: 'Ward 4', category: 'blue-ward-cabin', group: 'Ward Beds' },
    { name: 'Ward 5', category: 'blue-ward-cabin', group: 'Ward Beds' },
    { name: 'Cabin 1', category: 'blue-ward-cabin', group: 'Cabin Beds' }, { name: 'Cabin 2', category: 'blue-ward-cabin', group: 'Cabin Beds' },
    { name: 'Cabin 3', category: 'blue-ward-cabin', group: 'Cabin Beds' }, { name: 'Cabin 4', category: 'blue-ward-cabin', group: 'Cabin Beds' },
    { name: 'Yellow 7', category: 'yellow-red', group: 'Yellow Beds' }, { name: 'Yellow 8', category: 'yellow-red', group: 'Yellow Beds' },
    { name: 'Yellow 9', category: 'yellow-red', group: 'Yellow Beds' }, { name: 'Yellow 10', category: 'yellow-red', group: 'Yellow Beds' },
    { name: 'Yellow 11', category: 'yellow-red', group: 'Yellow Beds' }, { name: 'Yellow 12', category: 'yellow-red', group: 'Yellow Beds' },
    { name: 'Red 14', category: 'yellow-red', group: 'Red Beds' }, { name: 'Red 15', category: 'yellow-red', group: 'Red Beds' },
    { name: 'Red 16', category: 'yellow-red', group: 'Red Beds' }, { name: 'Red 17', category: 'yellow-red', group: 'Red Beds' },
    { name: 'Red 18', category: 'yellow-red', group: 'Red Beds' }, { name: 'Red 19', category: 'yellow-red', group: 'Red Beds' },
    { name: 'Red 20', category: 'yellow-red', group: 'Red Beds' }
];

// Global map to store resident's full category (e.g., 'Phase B - Year 5 Old')
let residentToFullCategoryMap = new Map();

// Define a precise order for categories for sorting selected names (Req 6)
const categoryOrderForSorting = [
    "Phase B - Year 5 Old", "Phase B - Year 5 New",
    "Phase B - Year 4 Old", "Phase B - Year 4 New",
    "Phase B - Year 3 Old", "Phase B - Year 3 New",
    "Phase A - Old", "Phase A - New",
    "Gynae", "Feto", "GP", "Pedisurgery", "FCPS" // New categories added here
];

// Metadata fields that, if selected, make a resident unavailable for *most other* duties (highest priority - Req 7)
const strictExclusionFields = new Set([
    'post-duty', 'on-leave-today', 'sick-leave', 'opd', 'pnr', 'ot'
]);

// Metadata fields that, if selected, make a resident unavailable for *bed assignments* and *new patients*
const bedAndNewPatientExclusionFields = new Set([
    ...strictExclusionFields, // includes post-duty, on-leave-today, sick-leave, opd, pnr, ot
    'emergency-duty', 'cabin-block-duty', 'post-duty-cabin-block',
    'post-anti-discrimination-duty', 'training-workshop', 'departmental-work',
    'infection-control' // Infection control also excludes from beds/new patients
]);


document.addEventListener('DOMContentLoaded', function() {
    initApp();
    
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    const dateField = document.getElementById('date-field');
    const manualDateCheckbox = document.getElementById('manual-date');
    if (!manualDateCheckbox.checked) {
        dateField.value = new Date().toISOString().substr(0, 10);
    }
    manualDateCheckbox.addEventListener('change', function() {
        dateField.disabled = this.checked;
        if (!this.checked && !dateField.value) {
            dateField.value = new Date().toISOString().substr(0, 10);
        }
    });
    
    const modal = document.getElementById('modal');
    document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('cancel-modal').addEventListener('click', () => modal.classList.add('hidden'));
    
    populateActiveBedsCheckboxGroup(); // Changed from select to checkbox group
    document.getElementById('active-beds-checkbox-group').addEventListener('change', (event) => { // Listen to group for delegation
        if (event.target.type === 'checkbox') {
            renderActiveBedCards();
        }
    });
    renderActiveBedCards(); // Initial render of bed cards
});

function initApp() {
    loadSettingsFromLocalStorage(); // Loads main settings and populates residentToFullCategoryMap
    
    document.getElementById('save-settings-btn').addEventListener('click', saveSettingsToApp);
    document.getElementById('save-current-settings-btn').addEventListener('click', archiveCurrentSettings);
    document.getElementById('load-saved-settings-btn').addEventListener('click', loadArchivedSettings);
    document.getElementById('load-sample-btn').addEventListener('click', loadSampleData);
    document.getElementById('reset-settings-btn').addEventListener('click', resetSettings);
    document.getElementById('add-category-btn').addEventListener('click', addNewCategory);

    document.getElementById('generate-btn').addEventListener('click', generateDistribution);
    document.getElementById('save-btn').addEventListener('click', saveDistribution);
    document.getElementById('load-btn').addEventListener('click', loadDistribution);
    document.getElementById('clear-btn').addEventListener('click', clearAllData);
    document.getElementById('copy-output-btn').addEventListener('click', copyOutputToClipboard);
    document.getElementById('load-previous-day-btn').addEventListener('click', loadPreviousDayAssignments);
    
    // Metadata Visibility Toggles (Req 8)
    const toggles = [
        'emergency-duty', 'post-anti-discrimination-duty',
        'training-workshop', 'departmental-work'
    ];
    toggles.forEach(fieldName => {
        const checkbox = document.getElementById(`toggle-${fieldName}`);
        const container = document.querySelector(`[data-field="${fieldName}"].metadata-field-container`);
        if (checkbox && container) {
            checkbox.addEventListener('change', (event) => {
                container.style.display = event.target.checked ? 'block' : 'none';
                localStorage.setItem(`metadataVisibility_${fieldName}`, event.target.checked);
            });
            // Apply initial visibility from localStorage or default hidden
            const isVisible = localStorage.getItem(`metadataVisibility_${fieldName}`) === 'true'; // Default is false (hidden) if not in localStorage
            checkbox.checked = isVisible;
            container.style.display = isVisible ? 'block' : 'none';
        }
    });

    populateMetadataCheckboxGroups(); // Initial population of all metadata checkboxes
    populateResidentDropdownsAndCheckboxes(); // Initial population of all bed/supervisor dropdowns/checkboxes
}

function loadSettingsFromLocalStorage() {
     if (localStorage.getItem('nicuSettings')) {
        const settings = JSON.parse(localStorage.getItem('nicuSettings'));
        applySettingsToUI(settings); // This also populates residentToFullCategoryMap
    }
}

function applySettingsToUI(settings) {
    residentToFullCategoryMap.clear(); // Clear map before repopulating

    // Default categories with sub-levels (for UI population)
    const defaultCategoriesMap = {
        'Phase B': {
            'Year 5 Old': 'phase-b-y5o', 'Year 5 New': 'phase-b-y5n',
            'Year 4 Old': 'phase-b-y4o', 'Year 4 New': 'phase-b-y4n',
            'Year 3 Old': 'phase-b-y3o', 'Year 3 New': 'phase-b-y3n'
        },
        'Phase A': {
            'Old': 'phase-a-old', 'New': 'phase-a-new'
        },
        'Gynae': 'gynae', 'Feto': 'feto',
        'GP': 'gp', 'Pedisurgery': 'pedisurgery', 'FCPS': 'fcps'
    };

    for (const topCategory in defaultCategoriesMap) {
        const subCategories = defaultCategoriesMap[topCategory];
        if (typeof subCategories === 'object') { // Has sub-levels
            for (const subCatName in subCategories) {
                const id = subCategories[subCatName];
                const textarea = document.getElementById(id);
                const fullCategoryName = `${topCategory} - ${subCatName}`;
                if (textarea && settings.categories[fullCategoryName]) {
                    textarea.value = settings.categories[fullCategoryName].join('\n');
                    settings.categories[fullCategoryName].forEach(name => residentToFullCategoryMap.set(name, fullCategoryName));
                } else if (textarea) {
                     textarea.value = ''; // Ensure it's cleared if no data
                }
            }
        } else { // Single level category
            const id = subCategories;
            const textarea = document.getElementById(id);
            if (textarea && settings.categories[topCategory]) {
                textarea.value = settings.categories[topCategory].join('\n');
                settings.categories[topCategory].forEach(name => residentToFullCategoryMap.set(name, topCategory));
            } else if (textarea) {
                textarea.value = ''; // Ensure it's cleared if no data
            }
        }
    }

    const customCategoriesContainer = document.getElementById('custom-categories');
    customCategoriesContainer.innerHTML = '';
    if (settings.customCategories) {
        settings.customCategories.forEach(category => {
            addCustomCategoryField(category.name, category.names.join('\n'));
            category.names.forEach(name => residentToFullCategoryMap.set(name, category.name));
        });
    }

    // After applying settings, refresh dependent UI parts
    populateMetadataCheckboxGroups();
    populateResidentDropdownsAndCheckboxes();
}


function populateActiveBedsCheckboxGroup() {
    const groupContainer = document.getElementById('active-beds-checkbox-group');
    groupContainer.innerHTML = ''; 
    const bedGroups = {};
    ALL_BED_DEFINITIONS.forEach(bed => {
        if (!bedGroups[bed.group]) {
            bedGroups[bed.group] = [];
        }
        bedGroups[bed.group].push(bed);
    });

    // Sort group names (optional, but good for consistency)
    const sortedGroupNames = Object.keys(bedGroups).sort();

    sortedGroupNames.forEach(groupName => {
        const optgroupLabelDiv = document.createElement('div');
        optgroupLabelDiv.className = 'optgroup-label';
        optgroupLabelDiv.textContent = groupName;
        groupContainer.appendChild(optgroupLabelDiv);

        // Sort beds within the group alphabetically (Req 4)
        const sortedBedsInGroup = bedGroups[groupName].sort((a, b) => a.name.localeCompare(b.name));

        sortedBedsInGroup.forEach(bed => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = bed.name;
            checkbox.id = `active-bed-cb-${CSS.escape(bed.name)}`;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(" " + bed.name));
            groupContainer.appendChild(label);
        });
    });
}


function renderActiveBedCards() {
    const blueWardCabinContainer = document.getElementById('blue-ward-cabin-container');
    const yellowRedContainer = document.getElementById('yellow-red-container');
    const activeBedsGroup = document.getElementById('active-beds-checkbox-group');
    
    blueWardCabinContainer.innerHTML = '';
    yellowRedContainer.innerHTML = '';

    const selectedBedNames = Array.from(activeBedsGroup.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

    let blueWardCabinHasBeds = false;
    let yellowRedHasBeds = false;

    ALL_BED_DEFINITIONS.forEach(bedDef => {
        if (selectedBedNames.includes(bedDef.name)) {
            const bedCard = createBedCard(bedDef.name);
            if (bedDef.category === 'blue-ward-cabin') {
                blueWardCabinContainer.appendChild(bedCard);
                blueWardCabinHasBeds = true;
            } else if (bedDef.category === 'yellow-red') {
                yellowRedContainer.appendChild(bedCard);
                yellowRedHasBeds = true;
            }
        }
    });
    
    const toggleEmptyMessage = (container, hasBeds) => {
        let emptyMsg = container.querySelector('.empty-message');
        if (!emptyMsg && !hasBeds) {
            emptyMsg = document.createElement('p');
            emptyMsg.className = 'text-gray-500 italic col-span-full empty-message';
            emptyMsg.textContent = 'No beds selected for this category.';
            container.appendChild(emptyMsg);
        } else if (emptyMsg) {
            emptyMsg.classList.toggle('hidden', hasBeds);
        }
    };

    toggleEmptyMessage(blueWardCabinContainer, blueWardCabinHasBeds);
    toggleEmptyMessage(yellowRedContainer, yellowRedHasBeds);
    
    populateResidentDropdownsAndCheckboxes(); 
}

function createBedCard(bedName) {
    const bedCard = document.createElement('div');
    bedCard.className = 'bed-card p-4 bg-white shadow-sm';
    bedCard.dataset.bedName = bedName; 
    bedCard.innerHTML = `
        <div class="flex justify-between items-start">
            <h3 class="font-semibold text-lg mb-3 text-gray-800">${bedName}</h3>
            <button class="clear-bed-btn" title="Clear assignments for this bed"><i class="fas fa-times"></i> Clear</button>
        </div>
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Assigned (Ph-B)</label>
            <select class="w-full p-2.5 border border-gray-300 rounded-md assigned-doctor text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Select doctor</option>
            </select>
        </div>
        <div class="mb-2">
            <label class="block text-xs font-medium text-gray-600 mb-1">Selected for Today</label>
            <div class="selected-todays-doctors-box min-h-[40px] border border-gray-200 rounded-md p-2 bg-gray-50 flex flex-wrap gap-1">None selected</div>
        </div>
        <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Assign Today's Doctors</label>
            <div class="scrollable-checkbox-group todays-doctors-checkbox-group"></div>
        </div>
    `;
    bedCard.querySelector('.clear-bed-btn').addEventListener('click', () => clearSingleBedAssignments(bedName));
    return bedCard;
}

function clearSingleBedAssignments(bedName) {
    const bedCard = document.querySelector(`.bed-card[data-bed-name="${CSS.escape(bedName)}"]`);
    if (bedCard) {
        bedCard.querySelector('.assigned-doctor').value = "";
        bedCard.querySelectorAll('.todays-doctors-checkbox-group input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateSelectedTodaysDoctorsInBox(bedCard);
        showModal("Bed Cleared", `Assignments for ${bedName} have been cleared.`);
    }
}


function updateSelectedTodaysDoctorsInBox(bedCardElement) {
    const displayBox = bedCardElement.querySelector('.selected-todays-doctors-box');
    const checkboxGroup = bedCardElement.querySelector('.todays-doctors-checkbox-group');
    if (!displayBox || !checkboxGroup) return;

    const selectedNames = Array.from(checkboxGroup.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
    const sortedNames = sortNamesByCategory(selectedNames); // Apply sorting (Req 5)

    displayBox.innerHTML = '';
    if (sortedNames.length === 0) {
        displayBox.classList.add('items-center', 'justify-center', 'text-gray-400', 'italic');
        displayBox.textContent = 'None selected';
    } else {
        displayBox.classList.remove('items-center', 'justify-center', 'text-gray-400', 'italic');
        sortedNames.forEach(name => {
            const tag = document.createElement('span');
            tag.className = 'selected-name-tag bg-sky-500'; // Specific color for todays doctors
            tag.textContent = name;
            tag.dataset.name = name; // Store name for easy deselection
            tag.addEventListener('click', (event) => { // Deselect on click (Req 5)
                const nameToDeselect = event.target.dataset.name;
                const checkbox = checkboxGroup.querySelector(`input[type="checkbox"][value="${CSS.escape(nameToDeselect)}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.dispatchEvent(new Event('change')); // Trigger change
                }
            });
            displayBox.appendChild(tag);
        });
    }
}

function getSelectedNamesFromMetadata(field) {
    const set = new Set();
    const groupContainer = document.querySelector(`.metadata-checkbox-group[data-field="${field}"]`);
    if (groupContainer) {
        groupContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => set.add(cb.value));
    }
    return set;
}

// This function determines if a resident should be *disabled* in a given checkbox field,
// based on selections in *other* fields.
function isResidentDisabledInField(residentName, targetField) {
    // 1. Check strict exclusions: If resident is selected in any strictExclusionField (and not the target field itself), they are disabled everywhere else.
    for (const field of strictExclusionFields) {
        if (field !== targetField && getSelectedNamesFromMetadata(field).has(residentName)) {
            return true;
        }
    }

    // 2. Check general exclusions for bed assignments and new patients
    // These apply to: bed assignment dropdowns, todays doctors checkboxes, supervisor checkboxes, new-patients field, infection-control field.
    const isBedRelatedField = targetField.startsWith('bed-') || targetField.startsWith('supervisor-');
    const isNewPatientsField = targetField === 'new-patients';
    const isInfectionControlField = targetField === 'infection-control';

    if (isBedRelatedField || isNewPatientsField || isInfectionControlField) {
        for (const field of bedAndNewPatientExclusionFields) {
            // If resident is selected in any of these exclusion fields (and it's not the current target field), disable.
            if (field !== targetField && getSelectedNamesFromMetadata(field).has(residentName)) {
                return true;
            }
        }
    }

    return false;
}


function populateMetadataCheckboxGroups() {
    const metadataGroupContainers = document.querySelectorAll('.metadata-checkbox-group');
    // residentToFullCategoryMap is populated by applySettingsToUI

    metadataGroupContainers.forEach(groupContainer => {
        const currentSelections = Array.from(groupContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        groupContainer.innerHTML = '';
        const field = groupContainer.dataset.field;

        const residentCheckboxes = { available: [], unavailable: [] };

        // Get all distinct residents and sort them by their category for display within the checkbox group
        const allResidents = Array.from(residentToFullCategoryMap.keys());
        const sortedResidents = allResidents.sort((a, b) => {
            const catA = residentToFullCategoryMap.get(a) || 'Custom';
            const catB = residentToFullCategoryMap.get(b) || 'Custom';
            const indexA = categoryOrderForSorting.indexOf(catA);
            const indexB = categoryOrderForSorting.indexOf(catB);

            if (indexA !== -1 && indexB !== -1) {
                if (indexA === indexB) return a.localeCompare(b); // Alphabetical within same category
                return indexA - indexB;
            }
            if (indexA !== -1) return -1; // A comes before B if B is a custom category
            if (indexB !== -1) return 1;  // B comes before A if A is a custom category
            return catA.localeCompare(catB) || a.localeCompare(b); // Alphabetical by custom category then name
        });

        // Group residents by their full category for displaying optgroup labels
        const groupedResidents = {};
        sortedResidents.forEach(name => {
            const fullCategoryName = residentToFullCategoryMap.get(name) || 'Others'; // Fallback for safety
            if (!groupedResidents[fullCategoryName]) {
                groupedResidents[fullCategoryName] = [];
            }
            groupedResidents[fullCategoryName].push(name);
        });

        // Sort the categories based on categoryOrderForSorting, then alphabetically for custom ones
        const sortedCategoryNames = Object.keys(groupedResidents).sort((catA, catB) => {
            const indexA = categoryOrderForSorting.indexOf(catA);
            const indexB = categoryOrderForSorting.indexOf(catB);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return catA.localeCompare(catB); // Alphabetical for custom categories not in explicit order
        });


        sortedCategoryNames.forEach(categoryName => {
            const optgroupLabelDiv = document.createElement('div');
            optgroupLabelDiv.className = 'optgroup-label';
            optgroupLabelDiv.textContent = categoryName;

            groupedResidents[categoryName].forEach(name => {
                const isDisabled = isResidentDisabledInField(name, field);
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = name;
                checkbox.name = `${field}-${name.replace(/\s+/g, '_')}`;
                checkbox.id = `checkbox-${field}-${CSS.escape(name.replace(/[^\w-]/g, ''))}`;

                if (currentSelections.includes(name)) checkbox.checked = true;
                checkbox.disabled = isDisabled;

                checkbox.addEventListener('change', () => {
                    updateSelectedNamesBox(groupContainer);
                    // Important: If an exclusion field (strict or bed/new-patient) changes,
                    // we need to re-evaluate ALL checkboxes across the app.
                    if (strictExclusionFields.has(field) || bedAndNewPatientExclusionFields.has(field)) {
                        populateMetadataCheckboxGroups(); // Re-render all metadata checkboxes
                        populateResidentDropdownsAndCheckboxes(); // Re-render all bed/supervisor checkboxes
                    }
                });

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(" " + name));

                if (isDisabled) {
                    label.classList.add('disabled-option');
                    residentCheckboxes.unavailable.push({el: label, optgroup: optgroupLabelDiv});
                } else {
                    residentCheckboxes.available.push({el: label, optgroup: optgroupLabelDiv});
                }
            });
        });

        // Append available checkboxes, then unavailable (Req 13)
        let lastAppendedOptgroupAvailable = null;
        residentCheckboxes.available.forEach(item => {
            if (item.optgroup && item.optgroup !== lastAppendedOptgroupAvailable) {
                groupContainer.appendChild(item.optgroup);
                lastAppendedOptgroupAvailable = item.optgroup;
            }
            groupContainer.appendChild(item.el);
        });

        if (residentCheckboxes.unavailable.length > 0 && residentCheckboxes.available.length > 0) {
            const separator = document.createElement('hr');
            separator.className = 'my-2 border-gray-300';
            groupContainer.appendChild(separator);
        }

        let lastAppendedOptgroupUnavailable = null;
        residentCheckboxes.unavailable.forEach(item => {
            if (item.optgroup && item.optgroup !== lastAppendedOptgroupUnavailable && item.optgroup !== lastAppendedOptgroupAvailable) {
                groupContainer.appendChild(item.optgroup);
                lastAppendedOptgroupUnavailable = item.optgroup;
            }
            groupContainer.appendChild(item.el);
        });

        updateSelectedNamesBox(groupContainer);
    });
}

// Utility function to sort names based on categoryOrderForSorting (Req 5)
function sortNamesByCategory(names) {
    return names.sort((a, b) => {
        const catA = residentToFullCategoryMap.get(a) || 'Custom';
        const catB = residentToFullCategoryMap.get(b) || 'Custom';

        const indexA = categoryOrderForSorting.indexOf(catA);
        const indexB = categoryOrderForSorting.indexOf(catB);

        if (indexA !== -1 && indexB !== -1) {
            if (indexA === indexB) return a.localeCompare(b); // Alphabetical within same category
            return indexA - indexB;
        }
        if (indexA !== -1) return -1; // A comes before B if B is a custom category
        if (indexB !== -1) return 1;  // B comes before A if A is a custom category
        return catA.localeCompare(catB) || a.localeCompare(b); // Alphabetical by custom category then name
    });
}

function updateSelectedNamesBox(groupContainer) {
    const field = groupContainer.dataset.field;
    const selectedBox = document.querySelector(`.selected-names-box[data-field="${field}"]`);
    if (selectedBox) {
        const selectedNames = Array.from(groupContainer.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
        const sortedNames = sortNamesByCategory(selectedNames); // Apply sorting (Req 5)

        selectedBox.innerHTML = '';
        if (sortedNames.length === 0) {
            selectedBox.classList.add('items-center', 'justify-center', 'text-gray-400', 'italic');
            selectedBox.textContent = 'None selected';
        } else {
            selectedBox.classList.remove('items-center', 'justify-center', 'text-gray-400', 'italic');
            sortedNames.forEach(name => {
                const tag = document.createElement('span');
                tag.className = 'selected-name-tag'; // bg-green-500 is default, but tag will inherit from style
                tag.textContent = name;
                tag.dataset.name = name; // Store name for easy deselection
                tag.addEventListener('click', (event) => { // Deselect on click (Req 5)
                    const nameToDeselect = event.target.dataset.name;
                    const checkbox = groupContainer.querySelector(`input[type="checkbox"][value="${CSS.escape(nameToDeselect)}"]`);
                    if (checkbox) {
                        checkbox.checked = false;
                        // Trigger change to re-populate and update availability across app
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
                selectedBox.appendChild(tag);
            });
        }
    }
}

function populateResidentDropdownsAndCheckboxes() { // Renamed
    const assignedDoctorSelects = document.querySelectorAll('.assigned-doctor');
    const todaysDoctorsCheckboxGroups = document.querySelectorAll('.todays-doctors-checkbox-group');
    const supervisorCheckboxGroups = { // Changed from selects to checkbox groups
        'blue-ward-cabin': document.getElementById('blue-ward-cabin-supervisors-checkbox-group'),
        'yellow-red': document.getElementById('yellow-red-supervisors-checkbox-group')
    };
    
    // Get all Phase B residents (combined from all sub-categories)
    const allPhaseBResidents = Array.from(residentToFullCategoryMap.entries())
                                .filter(([name, category]) => category.startsWith('Phase B'))
                                .map(([name]) => name);
    // Sort Phase B residents by their sub-category order (Req 4, which is covered by Req 5's categoryOrderForSorting)
    const sortedPhaseBResidents = sortNamesByCategory(allPhaseBResidents);

    // For assignedDoctor (Phase B for beds - Req 9: always available in this dropdown)
    assignedDoctorSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select doctor</option>';
        sortedPhaseBResidents.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
        select.value = currentValue; // Restore selection
    });

    // For Supervisor Checkbox Groups (Phase B only) (Req 10)
    for (const key in supervisorCheckboxGroups) {
        const groupElement = supervisorCheckboxGroups[key];
        if (!groupElement) continue;

        const currentSelectedNames = Array.from(groupElement.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        groupElement.innerHTML = ''; 

        const availableForGroup = [];
        const unavailableForGroup = [];

        sortedPhaseBResidents.forEach(name => {
            const isDisabled = isResidentDisabledInField(name, `supervisor-${key}`); // Use a unique field name for this context
            const checkboxId = `supervisor-${key}-${CSS.escape(name.replace(/[^\w-]/g, ''))}`;
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = name;
            checkbox.id = checkboxId;
            if (currentSelectedNames.includes(name)) checkbox.checked = true;
            checkbox.disabled = isDisabled;
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(" " + name));

            if (isDisabled) {
                label.classList.add('disabled-option');
                unavailableForGroup.push(label);
            } else {
                availableForGroup.push(label);
            }
        });
        availableForGroup.forEach(label => groupElement.appendChild(label));
        if (unavailableForGroup.length > 0 && availableForGroup.length > 0) {
            const separator = document.createElement('hr');
            separator.className = 'my-2 border-gray-300';
            groupElement.appendChild(separator);
        }
        unavailableForGroup.forEach(label => groupElement.appendChild(label));
    }


    // For Today's Doctors (checkbox groups - non-Phase B)
    todaysDoctorsCheckboxGroups.forEach(groupElement => {
        const bedCard = groupElement.closest('.bed-card');
        const bedName = bedCard ? bedCard.dataset.bedName : 'unknown'; // Get bed name for specific field ID
        const currentSelectedNames = Array.from(groupElement.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        groupElement.innerHTML = ''; 

        const availableForGroup = { categories: {} };
        const unavailableForGroup = { categories: {} };

        // Get all non-Phase B residents
        const nonPhaseBResidents = Array.from(residentToFullCategoryMap.entries())
                                    .filter(([name, category]) => !category.startsWith('Phase B'));

        // Group them by their full category name
        nonPhaseBResidents.forEach(([name, fullCategoryName]) => {
            if (!availableForGroup.categories[fullCategoryName]) {
                availableForGroup.categories[fullCategoryName] = [];
                unavailableForGroup.categories[fullCategoryName] = [];
            }

            const isDisabled = isResidentDisabledInField(name, `todays-doctor-${bedName}`); // Unique field name
            const checkboxId = `bed-${bedName}-todaydoc-${CSS.escape(name.replace(/[^\w-]/g, ''))}`;
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = name;
            checkbox.id = checkboxId;
            if (currentSelectedNames.includes(name)) checkbox.checked = true;
            checkbox.disabled = isDisabled;

            checkbox.addEventListener('change', () => {
                updateSelectedTodaysDoctorsInBox(bedCard);
            });
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(" " + name));

            if (isDisabled) {
                label.classList.add('disabled-option');
                unavailableForGroup.categories[fullCategoryName].push(label);
            } else {
                availableForGroup.categories[fullCategoryName].push(label);
            }
        });
        
        // Sort category keys for consistent display
        const sortedAllCategoryNames = Object.keys(availableForGroup.categories).sort((catA, catB) => {
            const indexA = categoryOrderForSorting.indexOf(catA);
            const indexB = categoryOrderForSorting.indexOf(catB);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return catA.localeCompare(catB);
        });


        let hasAddedAvailable = false;
        sortedAllCategoryNames.forEach(catName => {
            if (availableForGroup.categories[catName].length > 0) {
                const optLabel = document.createElement('div');
                optLabel.className = 'optgroup-label';
                optLabel.textContent = catName;
                groupElement.appendChild(optLabel);
                availableForGroup.categories[catName].forEach(label => groupElement.appendChild(label));
                hasAddedAvailable = true;
            }
        });

        let hasAddedUnavailable = false;
        sortedAllCategoryNames.forEach(catName => {
            if (unavailableForGroup.categories[catName].length > 0) {
                if (hasAddedAvailable && !hasAddedUnavailable) { 
                    const separator = document.createElement('hr');
                    separator.className = 'my-2 border-gray-300';
                    groupElement.appendChild(separator);
                }
                const optLabel = document.createElement('div');
                optLabel.className = 'optgroup-label';
                optLabel.textContent = catName;
                groupElement.appendChild(optLabel);
                unavailableForGroup.categories[catName].forEach(label => groupElement.appendChild(label));
                hasAddedUnavailable = true;
            }
        });
        updateSelectedTodaysDoctorsInBox(bedCard); 
    });
}

function addCustomCategoryField(name = '', names = '') {
    const container = document.getElementById('custom-categories');
    const uniqueId = `custom-cat-${Date.now()}`;
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'custom-category-field mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200';
    categoryDiv.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <label for="${uniqueId}-name" class="block text-sm font-medium text-gray-700">Category Name</label>
            <button class="remove-category text-red-500 hover:text-red-700 transition"><i class="fas fa-times-circle"></i></button>
        </div>
        <input type="text" id="${uniqueId}-name" value="${name}" class="category-name w-full p-2.5 border border-gray-300 rounded-md mb-3 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter category name">
        <label for="${uniqueId}-names" class="block text-sm font-medium text-gray-700 mb-1">Resident Names</label>
        <textarea id="${uniqueId}-names" class="w-full p-2.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500" rows="4" placeholder="Enter names, separated by commas or one per line">${names}</textarea>
    `;
    container.appendChild(categoryDiv);
    categoryDiv.querySelector('.remove-category').addEventListener('click', function() {
        showModal('Confirm Removal', 'Are you sure you want to remove this category?', () => categoryDiv.remove(), null, true);
    });
}

function addNewCategory() { addCustomCategoryField(); }

function getCurrentSettingsFromUI() {
    const settings = { categories: {}, customCategories: [] };

    // Default categories with sub-levels
    const defaultCategoriesMap = {
        'Phase B': {
            'Year 5 Old': 'phase-b-y5o', 'Year 5 New': 'phase-b-y5n',
            'Year 4 Old': 'phase-b-y4o', 'Year 4 New': 'phase-b-y4n',
            'Year 3 Old': 'phase-b-y3o', 'Year 3 New': 'phase-b-y3n'
        },
        'Phase A': {
            'Old': 'phase-a-old', 'New': 'phase-a-new'
        },
        'Gynae': 'gynae',
        'Feto': 'feto',
        'GP': 'gp',         // New
        'Pedisurgery': 'pedisurgery', // New
        'FCPS': 'fcps'      // New
    };

    for (const topCategory in defaultCategoriesMap) {
        const subCategories = defaultCategoriesMap[topCategory];
        if (typeof subCategories === 'object') { // Has sub-levels
            for (const subCatName in subCategories) {
                const id = subCategories[subCatName];
                const textarea = document.getElementById(id);
                if (textarea) {
                    const names = textarea.value.split(/[\n,]+/).map(name => name.trim()).filter(name => name);
                    settings.categories[`${topCategory} - ${subCatName}`] = names;
                }
            }
        } else { // Single level category
            const id = subCategories;
            const textarea = document.getElementById(id);
            if (textarea) {
                const names = textarea.value.split(/[\n,]+/).map(name => name.trim()).filter(name => name);
                settings.categories[topCategory] = names;
            }
        }
    }

    document.querySelectorAll('#custom-categories .custom-category-field').forEach(div => {
        const nameInput = div.querySelector('.category-name');
        const textarea = div.querySelector('textarea');
        if (nameInput && textarea && nameInput.value.trim()) {
            const names = textarea.value.split(/[\n,]+/).map(name => name.trim()).filter(name => name);
            settings.customCategories.push({ name: nameInput.value.trim(), names: names });
        }
    });
    return settings;
}

function saveSettingsToApp() { // Formerly saveSettings
    const settings = getCurrentSettingsFromUI();
    localStorage.setItem('nicuSettings', JSON.stringify(settings));
    // Refresh UI that depends on settings
    populateMetadataCheckboxGroups(); 
    populateResidentDropdownsAndCheckboxes();  
    showModal('Success', 'Settings saved and applied to app!');
}

function archiveCurrentSettings() { // Req 7
    const settings = getCurrentSettingsFromUI();
    const timestamp = new Date().toISOString();
    localStorage.setItem(`nicuSettingsSnapshot_${timestamp}`, JSON.stringify(settings));
    showModal('Success', `Current settings archived: ${timestamp.replace('T', ' ').substring(0,19)}`);
}

function loadArchivedSettings() { // Req 7
    const savedSettingsSnapshots = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('nicuSettingsSnapshot_')) {
            savedSettingsSnapshots.push({ key: key, display: `Snapshot from ${key.substring(21,40).replace('T',' ')}` });
        }
    }
    if (savedSettingsSnapshots.length === 0) { showModal('Info', 'No archived settings found.'); return; }
    savedSettingsSnapshots.sort((a,b) => b.key.localeCompare(a.key)); // Newest first

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `<p class="mb-3 text-sm text-gray-600">Select settings snapshot to load:</p>
        <select id="settings-snapshot-select" class="w-full p-2.5 border border-gray-300 rounded-md mb-4 focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
            ${savedSettingsSnapshots.map(s => `<option value="${s.key}">${s.display}</option>`).join('')}
        </select>`;
    
    showModal('Load Archived Settings', '', () => {
        const selectedKey = document.getElementById('settings-snapshot-select').value;
        if (!selectedKey) return;
        const settingsData = JSON.parse(localStorage.getItem(selectedKey));
        applySettingsToUI(settingsData); // Apply to UI textareas and populate residentToFullCategoryMap
        saveSettingsToApp(); // Save as current main settings and refresh everything
        showModal('Success', 'Archived settings loaded and applied!');
    }, null, true);
}

function loadSampleData() {
    showModal('Load Sample Data', 'This will replace your current settings and save them. Continue?', () => {
        const sampleSettings = {
            categories: {
                'Phase B - Year 5 Old': ['Dr. Sonia', 'Dr. Shanta'],
                'Phase B - Year 5 New': ['Dr. Tazim', 'Dr. Rumana'],
                'Phase B - Year 4 Old': ['Dr. Upama', 'Dr. Maimuna'],
                'Phase B - Year 4 New': ['Dr. Afrina', 'Dr. Tishat'],
                'Phase B - Year 3 Old': ['Dr. Zahid', 'Dr. Saikot'],
                'Phase B - Year 3 New': ['Dr. Ikbal', 'Dr. Kashem'],
                'Phase A - Old': ['Dr. Hira', 'Dr. Zarin', 'Dr. Anwara'],
                'Phase A - New': ['Dr. Yeasmin', 'Dr. Tamanna', 'Dr. Akhteruzzaman'],
                'Gynae': ['Dr. Sabrina(Gynae)', 'Dr. Aimun (Gynae)', 'Dr. Sharmin (Gynae)'],
                'Feto': ['Dr. Farjana', 'Dr. Karishma', 'Dr. Nusrat'],
                'GP': ['Dr. Ram', 'Dr. Trisha'], // New
                'Pedisurgery': ['Dr. Zubayra', 'Dr. Liam'], // New
                'FCPS': ['Dr. Olivia', 'Dr. Noah'] // New
            },
            customCategories: [{ name: "Fellows", names: ["Dr. Fellow A", "Dr. Fellow B"] }]
        };
        applySettingsToUI(sampleSettings);
        saveSettingsToApp(); // Save as current main settings
        showModal('Success', 'Sample data loaded and applied! Settings have been saved.');
    }, null, true);
}

function resetSettings() {
    showModal('Reset Settings', 'This will clear all resident names and custom categories, and save. Are you sure?', () => {
        document.querySelectorAll('#settings textarea').forEach(textarea => textarea.value = '');
        document.getElementById('custom-categories').innerHTML = '';
        saveSettingsToApp(); // This will save the empty state and refresh UI
        showModal('Success', 'Settings reset successfully!');
    }, null, true);
}

function generateDistribution() {
    const distributionData = {
        date: document.getElementById('date-field').value,
        metadata: {},
        activeBeds: Array.from(document.getElementById('active-beds-checkbox-group').querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value),
        beds: { blueWardCabin: [], yellowRed: [] },
        supervisors: { 
            blueWardCabin: Array.from(document.getElementById('blue-ward-cabin-supervisors-checkbox-group').querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value),
            yellowRed: Array.from(document.getElementById('yellow-red-supervisors-checkbox-group').querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value)
        }
    };
    
    document.querySelectorAll('.metadata-checkbox-group').forEach(groupContainer => {
        const field = groupContainer.dataset.field;
        distributionData.metadata[field] = Array.from(groupContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    });
    
    document.querySelectorAll('#blue-ward-cabin-container .bed-card').forEach(card => {
        distributionData.beds.blueWardCabin.push({
            bed: card.dataset.bedName,
            assignedDoctor: card.querySelector('.assigned-doctor').value,
            todaysDoctors: Array.from(card.querySelectorAll('.todays-doctors-checkbox-group input[type="checkbox"]:checked')).map(cb => cb.value)
        });
    });
    document.querySelectorAll('#yellow-red-container .bed-card').forEach(card => {
        distributionData.beds.yellowRed.push({
            bed: card.dataset.bedName,
            assignedDoctor: card.querySelector('.assigned-doctor').value,
            todaysDoctors: Array.from(card.querySelectorAll('.todays-doctors-checkbox-group input[type="checkbox"]:checked')).map(cb => cb.value)
        });
    });
    
    localStorage.setItem('currentDistribution', JSON.stringify(distributionData));
    generateFormattedOutput(distributionData);
    document.getElementById('output-section').classList.remove('hidden');
    showModal('Generated!', 'Distribution has been generated.');
}

function generateFormattedOutput(data) {
    const dateString = data.date; // Should be YYYY-MM-DD
    let dateObj;
    if (dateString && dateString.includes('-')) { // Basic check for YYYY-MM-DD format
        const parts = dateString.split('-');
        dateObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])); // Use UTC to avoid timezone shifts
    } else {
        dateObj = new Date(); // Fallback, should not happen if date is always set
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[dateObj.getUTCDay()];
    const formattedDate = `${dateObj.getUTCDate()}/${dateObj.getUTCMonth() + 1}/${dateObj.getUTCFullYear()}`;
    let output = `Bed distribution (${formattedDate}) ${dayName}\n\n(Doctors within brackets are assigned. Today's doctors are listed per bed. Assigned doctors: get updates from follow-up doctors.)\n\n`;
    
    const metadataOrder = [
        'post-duty', '24-hour-duty', 'emergency-duty', 'cabin-block-duty', 'post-duty-cabin-block', 
        'post-anti-discrimination-duty', 'on-leave-today', 'sick-leave', 'opd',
        'training-workshop', 'departmental-work', 'infection-control', 
        'pnr', 'ot', 'new-patients', 'new-case-presenter', 'referral'
    ];

    metadataOrder.forEach(key => {
        const labelElement = document.querySelector(`.metadata-field-container[data-field="${key}"]`)?.querySelector('label.block');
        let labelText = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (labelElement) { // Try to get the exact label text from HTML
            labelText = labelElement.textContent;
        }

        if (data.metadata[key] && data.metadata[key].length > 0) {
            output += `#${labelText}: ${data.metadata[key].join(', ')}\n`;
        } else {
            output += `#${labelText}: \n`; 
        }
    });
    output += "\nNICU Bed distribution:\n\n";

    const formatBedSectionOutput = (title, bedDataKey, supervisors) => {
        const sectionBedDefinitions = ALL_BED_DEFINITIONS.filter(bd => 
            (bedDataKey === 'blueWardCabin' && bd.category === 'blue-ward-cabin') ||
            (bedDataKey === 'yellowRed' && bd.category === 'yellow-red')
        );

        const activeBedsForSection = data.beds[bedDataKey] || [];
        const orderedBedsData = [];
        sectionBedDefinitions.forEach(bedDef => {
            const foundBedData = activeBedsForSection.find(b => b.bed === bedDef.name);
            if (foundBedData) {
                orderedBedsData.push(foundBedData);
            }
        });

        let sectionOutput = `#${title}\n`;
        if (supervisors.length > 0) {
            sectionOutput += "Supervisors: " + supervisors.join(', ') + '\n'; 
        }
        
        // Get all unique "Today's Doctors" for this section and sort them
        const uniqueTodaysDoctorsOverall = sortNamesByCategory([...new Set(orderedBedsData.flatMap(bed => bed.todaysDoctors))]);
        if (uniqueTodaysDoctorsOverall.length > 0) {
             sectionOutput += `Today's Doctors: ${uniqueTodaysDoctorsOverall.join(', ')}\n`;
        }
        sectionOutput += '\n';

        orderedBedsData.forEach(bed => {
            if (bed.assignedDoctor || bed.todaysDoctors.length > 0) {
                sectionOutput += `${bed.bed}: (${bed.assignedDoctor || 'N/A'})`;
                if (bed.todaysDoctors.length > 0) {
                    sectionOutput += ` ${bed.todaysDoctors.join(', ')}`;
                }
                sectionOutput += '\n';
            }
        });
        return sectionOutput + '\n';
    };
    output += formatBedSectionOutput('Blue, Ward, Cabin', 'blueWardCabin', data.supervisors.blueWardCabin);
    output += formatBedSectionOutput('Yellow, Red', 'yellowRed', data.supervisors.yellowRed);
    
    output += `(In case of any OT in SSH, OT doctor will attend after communicating with MOM. MOM will arrange replacement.)\n`;
    document.getElementById('output-textarea').value = output;
}

function copyOutputToClipboard() {
    const outputTextarea = document.getElementById('output-textarea');
    if (!outputTextarea.value) {
        showModal('Info', 'Nothing to copy.'); return;
    }
    outputTextarea.select();
    outputTextarea.setSelectionRange(0, 99999); 
    try {
        document.execCommand('copy');
        showModal('Success', 'Output copied to clipboard!');
    } catch (err) {
        showModal('Error', 'Failed to copy.'); console.error('Copy failed:', err);
    }
    window.getSelection().removeAllRanges();
}

function saveDistribution() {
    const currentDistribution = localStorage.getItem('currentDistribution');
    if (!currentDistribution) {
        showModal('Error', 'No distribution to save. Generate first.'); return;
    }
    const timestamp = new Date().toISOString();
    const distributionData = JSON.parse(currentDistribution);
    // Ensure the key includes the distribution's specific date for easier lookup
    const keyDate = distributionData.date || new Date().toISOString().substring(0,10);
    localStorage.setItem(`nicuDistribution_${keyDate}_${timestamp}`, currentDistribution);
    showModal('Success', `Distribution saved for ${keyDate} at ${timestamp.replace('T', ' ').substring(11,19)}`);
}

function loadPreviousDayAssignments() { // Req 11
    const currentDateStr = document.getElementById('date-field').value;
    if (!currentDateStr) {
        showModal("Error", "Please set a current date first.");
        return;
    }
    const currentDate = new Date(currentDateStr + "T00:00:00Z"); // Treat as UTC
    currentDate.setUTCDate(currentDate.getUTCDate() - 1); // Go to previous day
    const previousDateStr = currentDate.toISOString().substring(0, 10);

    const previousDayDistributions = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Match keys that start with nicuDistribution_ and contain the previousDateStr
        if (key.startsWith('nicuDistribution_') && key.includes(`_${previousDateStr}_`)) {
             try {
                const distData = JSON.parse(localStorage.getItem(key));
                // Double check the date inside the data too
                if (distData.date === previousDateStr) {
                   previousDayDistributions.push({ key: key, timestamp: key.substring(key.lastIndexOf('_') + 1) });
                }
            } catch (e) { console.error("Error parsing saved distribution for previous day:", key, e); }
        }
    }

    if (previousDayDistributions.length === 0) {
        showModal('Info', `No saved distributions found for the previous day (${previousDateStr}).`);
        return;
    }
    // Sort to get the latest one from the previous day
    previousDayDistributions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    const latestPreviousDayKey = previousDayDistributions[0].key;
    const distributionData = JSON.parse(localStorage.getItem(latestPreviousDayKey));
    
    // Load this distribution, but keep the current UI date
    // The loadDistributionByKey function will handle applying data
    loadDistributionByKey(latestPreviousDayKey, true); // true to indicate it's a previous day load
    showModal('Previous Day Loaded', `Loaded assignments from ${previousDateStr}. The date field remains as today. Please review and generate for today's date.`);
}

function loadDistributionByKey(key, isPreviousDayLoad = false) {
    const distributionData = JSON.parse(localStorage.getItem(key));
    if (!distributionData) {
        showModal("Error", "Could not load selected distribution.");
        return;
    }

    // If it's not a previous day load, set the date field from the loaded data.
    // If it IS a previous day load, the date field STAYS AS IS.
    if (!isPreviousDayLoad) {
        document.getElementById('date-field').value = distributionData.date;
    }
    
    const activeBedsGroup = document.getElementById('active-beds-checkbox-group');
    activeBedsGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    if (distributionData.activeBeds) {
        distributionData.activeBeds.forEach(bedName => {
            const checkbox = activeBedsGroup.querySelector(`input[type="checkbox"][value="${CSS.escape(bedName)}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    renderActiveBedCards(); // Creates cards, calls populateResidentDropdownsAndCheckboxes

    document.querySelectorAll('.metadata-checkbox-group').forEach(groupContainer => {
        const field = groupContainer.dataset.field;
        // Uncheck all first, then check based on loaded data
        groupContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => checkbox.checked = false); 
        if (distributionData.metadata[field]) {
            distributionData.metadata[field].forEach(name => {
                const checkbox = groupContainer.querySelector(`input[type="checkbox"][value="${CSS.escape(name)}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
        updateSelectedNamesBox(groupContainer);
    });
    
    // Re-populate all checkboxes/dropdowns based on newly loaded metadata state for correct availability
    populateMetadataCheckboxGroups(); 
    populateResidentDropdownsAndCheckboxes(); 

    const loadBedCardAssignments = (containerId, bedDataArray) => {
         document.querySelectorAll(`#${containerId} .bed-card`).forEach(card => {
            const bedName = card.dataset.bedName;
            const bedData = bedDataArray.find(b => b.bed === bedName);
            if (bedData) {
                // For assigned doctor (Phase B), Req 9 means always available in dropdown
                card.querySelector('.assigned-doctor').value = bedData.assignedDoctor || "";
                
                const todaysCheckboxes = card.querySelectorAll('.todays-doctors-checkbox-group input[type="checkbox"]');
                todaysCheckboxes.forEach(cb => cb.checked = false);
                if (bedData.todaysDoctors) {
                    bedData.todaysDoctors.forEach(name => {
                        const checkbox = card.querySelector(`.todays-doctors-checkbox-group input[type="checkbox"][value="${CSS.escape(name)}"]`);
                        // Check if checkbox exists and is not disabled by new availability rules
                        if (checkbox && !checkbox.disabled) checkbox.checked = true;
                    });
                }
                updateSelectedTodaysDoctorsInBox(card);
            }
        });
    };
    loadBedCardAssignments('blue-ward-cabin-container', distributionData.beds.blueWardCabin || []);
    loadBedCardAssignments('yellow-red-container', distributionData.beds.yellowRed || []);

    const loadSupervisorCheckboxes = (groupId, supervisorArray) => {
        const groupElement = document.getElementById(groupId);
        if (!groupElement) return;
        groupElement.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        if (supervisorArray) {
            supervisorArray.forEach(name => {
                const checkbox = groupElement.querySelector(`input[type="checkbox"][value="${CSS.escape(name)}"]`);
                 if (checkbox && !checkbox.disabled) checkbox.checked = true; // Check if checkbox exists and is not disabled
            });
        }
    };
    loadSupervisorCheckboxes('blue-ward-cabin-supervisors-checkbox-group', distributionData.supervisors.blueWardCabin);
    loadSupervisorCheckboxes('yellow-red-supervisors-checkbox-group', distributionData.supervisors.yellowRed || []);

    localStorage.setItem('currentDistribution', JSON.stringify(distributionData)); // Set as current working copy
    generateFormattedOutput(distributionData); // Generate output based on loaded data
    document.getElementById('output-section').classList.remove('hidden');
}


function loadDistribution() {
    const savedDistributions = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('nicuDistribution_')) {
            try {
                const distData = JSON.parse(localStorage.getItem(key));
                const keyParts = key.split('_'); // Expects format nicuDistribution_DATE_TIMESTAMP
                const displayDate = keyParts.length > 2 ? keyParts[1] : distData.date;
                const displayTimestamp = keyParts.length > 2 ? keyParts[2].substring(0,19).replace('T',' ') : 'Unknown time';
                savedDistributions.push({ key: key, date: distData.date, display: `${displayDate} (${displayTimestamp})` });
            } catch (e) { console.error("Error parsing saved distribution:", key, e); }
        }
    }
    if (savedDistributions.length === 0) { showModal('Info', 'No saved distributions.'); return; }
    savedDistributions.sort((a,b) => b.key.localeCompare(a.key));

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `<p class="mb-3 text-sm text-gray-600">Select distribution to load:</p>
        <select id="distribution-select" class="w-full p-2.5 border border-gray-300 rounded-md mb-4 focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
            ${savedDistributions.map(dist => `<option value="${dist.key}">${dist.display}</option>`).join('')}
        </select>`;
    
    showModal('Load Saved Distribution', '', () => {
        const selectedKey = document.getElementById('distribution-select').value;
        if (!selectedKey) return;
        loadDistributionByKey(selectedKey, false); // false = not a previous day load
        showModal('Success', 'Distribution loaded!');
    }, null, true);
}

function clearAllData() {
    showModal('Clear All Data', 'Clear current assignments, metadata, and output? Settings remain. Continue?', () => {
        document.querySelectorAll('.metadata-checkbox-group input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.metadata-checkbox-group').forEach(updateSelectedNamesBox);

        const activeBedsGroup = document.getElementById('active-beds-checkbox-group');
        activeBedsGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        renderActiveBedCards(); // Clears cards

        document.querySelectorAll('.assigned-doctor').forEach(select => select.selectedIndex = 0);
        document.querySelectorAll('.todays-doctors-checkbox-group input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.selected-todays-doctors-box').forEach(box => {
            box.innerHTML = 'None selected';
            box.classList.add('items-center', 'justify-center', 'text-gray-400', 'italic');
        });
        
        ['blue-ward-cabin-supervisors-checkbox-group', 'yellow-red-supervisors-checkbox-group'].forEach(id => {
            const group = document.getElementById(id);
            if (group) group.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        });

        if (!document.getElementById('manual-date').checked) {
            document.getElementById('date-field').value = new Date().toISOString().substr(0, 10);
        }
        
        // Re-evaluate and re-populate all checkboxes/dropdowns based on cleared metadata state
        populateMetadataCheckboxGroups(); 
        populateResidentDropdownsAndCheckboxes();    
        document.getElementById('output-textarea').value = '';
        document.getElementById('output-section').classList.add('hidden');
        localStorage.removeItem('currentDistribution');
        showModal('Success', 'Current distribution data cleared!');
    }, null, true);
}

function showModal(title, bodyText, confirmCallback = null, customBodyContent = null, showCancel = false) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    const modalBodyEl = document.getElementById('modal-body');
    
    if (customBodyContent !== null && typeof customBodyContent === 'string') {
         modalBodyEl.innerHTML = customBodyContent;
    } else if (customBodyContent !== null && customBodyContent instanceof HTMLElement) {
        modalBodyEl.innerHTML = ''; 
        modalBodyEl.appendChild(customBodyContent);
    } else {
        modalBodyEl.textContent = bodyText;
    }
    
    const confirmBtn = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('cancel-modal');
    const newConfirmBtn = confirmBtn.cloneNode(true); 
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.onclick = () => {
        if (confirmCallback) confirmCallback();
        modal.classList.add('hidden');
    };
    cancelBtn.classList.toggle('hidden', !showCancel);
    modal.classList.remove('hidden');
}
