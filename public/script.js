document.addEventListener('DOMContentLoaded', function() {
    const usersContainer = document.getElementById('usersContainer');
    const tableView = document.getElementById('tableView');
    const loadAllBtn = document.getElementById('loadAllBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const viewToggle = document.getElementById('viewToggle');
    
    let currentView = 'cards'; // 'cards' or 'table'
    let allUsersData = []; // This will store all loaded data
    let filteredUsersData = []; // This will store filtered data for searches
    
    // Initialize toggle switch
    viewToggle.addEventListener('change', function() {
        currentView = this.checked ? 'table' : 'cards';
        updateView();
    });
    
    // Add sort dropdown
    const sortContainer = document.createElement('div');
    sortContainer.className = 'mb-3';
    sortContainer.innerHTML = `
        <div class="input-group" style="width: 250px;">
            <label class="input-group-text" for="sortSelect">Sort By</label>
            <select class="form-select" id="sortSelect">
                <option value="">None</option>
                <option value="points-desc">Points (High to Low)</option>
                <option value="points-asc">Points (Low to High)</option>
                <option value="count-desc">Program Count (High to Low)</option>
                <option value="count-asc">Program Count (Low to High)</option>
            </select>
        </div>
    `;
    loadAllBtn.parentNode.insertBefore(sortContainer, loadAllBtn);
    
    // Add key listener for search
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter' || !e.target.value.trim() ) {
            searchBtn.click();
        }
    });
    
    // Sort functionality
    document.getElementById('sortSelect').addEventListener('change', function() {
        const sortValue = this.value;
        if (!sortValue) {
            filteredUsersData = [...allUsersData];
        } else {
            const [field, order] = sortValue.split('-');
            filteredUsersData.sort((a, b) => {
                const aData = a.skillRackData || {};
                const bData = b.skillRackData || {};
                
                let aValue, bValue;
                
                if (field === 'points') {
                    aValue = aData.pointsCalculation?.totalPoints || 0;
                    bValue = bData.pointsCalculation?.totalPoints || 0;
                } else { // count
                    aValue = aData.programCounts?.programsSolved || 0;
                    bValue = bData.programCounts?.programsSolved || 0;
                }
                
                return order === 'desc' ? bValue - aValue : aValue - bValue;
            });
        }
        updateView();
    });
    
    // Load all users initially (but don't load SkillRack data yet)
    fetchBasicUserData();
    
    // Load all SkillRack data (only when this button is clicked)
    loadAllBtn.addEventListener('click', function() {
        fetchAllSkillRackData();
    });
    
    // Search functionality (now works on already loaded data)
    searchBtn.addEventListener('click', function() {
        const searchTerm = searchInput.value.toLowerCase();
        if (!searchTerm) {
            filteredUsersData = [...allUsersData]; // Reset to all data if search is empty
        } else {
            filteredUsersData = allUsersData.filter(item => {
                const user = item.user || item;
                return (
                    user.registerNumber.toLowerCase().includes(searchTerm) || 
                    (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                    (item.skillRackData?.basicInfo?.name && 
                     item.skillRackData.basicInfo.name.toLowerCase().includes(searchTerm))
                );
            });
        }
        updateView();
    });
    
    function fetchBasicUserData() {
        loadingIndicator.style.display = 'block';
        usersContainer.style.display='none';
        fetch('/api/users')
            .then(response => response.json())
            .then(users => {
                // Initialize with basic user data (no SkillRack data yet)
                allUsersData = users.map(user => ({ user }));
                filteredUsersData = [...allUsersData];
                updateView();
            })
            .catch(error => {
                console.error('Error:', error);
            })
            .finally(()=>{
                loadingIndicator.style.display = 'none';
                usersContainer.style.display='flex';
            });
    }
    
    function fetchAllSkillRackData() {
        loadingIndicator.style.display = 'block';
        usersContainer.style.display='none';
        fetch('/api/all-users-data')
            .then(response => response.json())
            .then(data => {
                allUsersData = data;
                filteredUsersData = [...allUsersData];
                updateView();
            })
            .catch(error => {
                console.error('Error:', error);
            })
            .finally(()=>{
                 loadingIndicator.style.display = 'none';
                 usersContainer.style.display='flex';
            });
    }
    
    function updateView() {
        if (currentView === 'cards') {
            tableView.style.display = 'none';
            usersContainer.style.display = 'flex';
            displayUsers(filteredUsersData);
        } else {
            usersContainer.style.display = 'none';
            tableView.style.display = 'block';
            displayTable(filteredUsersData);
        }
    }
    
    function displayUsers(usersData) {
        usersContainer.innerHTML = '';
        
        if (usersData.length === 0) {
            usersContainer.innerHTML = '<div class="col-12 text-center py-4"><p>No users found</p></div>';
            return;
        }
        
        usersData.forEach(item => {
            const user = item.user || item;
            const skillRackData = item.skillRackData;
            
            const userCard = document.createElement('div');
            userCard.className = 'col-md-6 col-lg-6';
            
            if (!skillRackData) {
                userCard.innerHTML = `
                    <div class="user-card">
                        <h5>${user.registerNumber}</h5>
                        <p class="text-muted">Email: ${user.email || 'N/A'}</p>
                        <a href="${user.skillRackURL}" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="bi bi-box-arrow-up-right"></i> SkillRack Profile
                        </a>
                        <button class="btn btn-sm btn-info mt-2 load-skillrack-btn" data-reg="${user.registerNumber}">
                            <i class="bi bi-arrow-repeat"></i> Load SkillRack Data
                        </button>
                        <div class="skillrack-data" id="data-${user.registerNumber}" style="display: none;"></div>
                    </div>
                `;
            } else {
                // Create language badges
                let languagesHTML = '';
                if (skillRackData.languageStats) {
                    for (const [lang, count] of Object.entries(skillRackData.languageStats)) {
                        languagesHTML += `<span class="badge bg-secondary badge-language">${lang.toUpperCase()}: ${count}</span>`;
                    }
                }
                
                userCard.innerHTML = `
                    <div class="user-card">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h4>${skillRackData.basicInfo?.name || 'N/A'}</h4>
                                <p class="text-muted"><strong>Reg No:</strong> ${user.registerNumber}</p>
                            </div>
                            <span class="badge rank-badge">Rank: ${skillRackData.programmingSummary?.rank || 'N/A'}</span>
                        </div>
                        
                        <div class="my-2">
                            <p class="mb-1"><strong>Program:</strong> ${skillRackData.basicInfo?.program || 'N/A'}</p>
                            <p class="mb-1"><strong>College:</strong> ${skillRackData.basicInfo?.college || 'N/A'}</p>
                            <p class="mb-1"><strong>Year:</strong> ${skillRackData.basicInfo?.year || 'N/A'}</p>
                        </div>
                        
                        <a href="${user.skillRackURL}" target="_blank" class="btn btn-sm btn-outline-primary mb-3">
                            <i class="bi bi-box-arrow-up-right"></i> SkillRack Profile
                        </a>
                        
                        <!-- Always visible important stats -->
                        <div class="stats-container">
                            <div class="stat-box">
                                <h5><i class="bi bi-code-square"></i> Programs Solved</h5>
                                <p class="fs-4 fw-bold">${skillRackData.programCounts?.programsSolved || 0}</p>
                            </div>
                            
                            <div class="stat-box">
                                <h5><i class="bi bi-graph-up"></i> Total Points</h5>
                                <p class="fs-4 fw-bold">${skillRackData.pointsCalculation?.totalPoints || 0}</p>
                            </div>
                        </div>
                        
                        <!-- Accordion for additional details -->
                        <div class="accordion mt-3" id="accordion-${user.registerNumber}">
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                                        data-bs-target="#collapse-${user.registerNumber}" aria-expanded="false" 
                                        aria-controls="collapse-${user.registerNumber}">
                                        Show Details
                                    </button>
                                </h2>
                                <div id="collapse-${user.registerNumber}" class="accordion-collapse collapse" 
                                    data-bs-parent="#accordion-${user.registerNumber}">
                                    <div class="accordion-body">
                                        <div class="stat-box">
                                            <h5><i class="bi bi-award"></i> Medals</h5>
                                            <p><i class="bi bi-trophy-fill medal-gold"></i> <strong>Gold:</strong> ${skillRackData.programmingSummary?.medals?.gold || 0}</p>
                                            <p><i class="bi bi-trophy-fill medal-silver"></i> <strong>Silver:</strong> ${skillRackData.programmingSummary?.medals?.silver || 0}</p>
                                            <p><i class="bi bi-trophy-fill medal-bronze"></i> <strong>Bronze:</strong> ${skillRackData.programmingSummary?.medals?.bronze || 0}</p>
                                        </div>
                                        
                                        <div class="stat-box">
                                            <h5><i class="bi bi-code-slash"></i> Program Types</h5>
                                            <p><strong>Code Test:</strong> ${skillRackData.programCounts?.codeTest || 0}</p>
                                            <p><strong>Code Track:</strong> ${skillRackData.programCounts?.codeTrack || 0}</p>
                                        </div>
                                        
                                        <div class="stat-box">
                                            <h5><i class="bi bi-filetype-js"></i> Languages</h5>
                                            ${languagesHTML || '<p>No language data</p>'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            usersContainer.appendChild(userCard);
        });
        
        // Add event listeners to the load buttons
        document.querySelectorAll('.load-skillrack-btn').forEach(button => {
            button.addEventListener('click', function() {
                const regNo = this.getAttribute('data-reg');
                fetchSingleSkillRackData(regNo);
            });
        });
    }
    
    function displayTable(usersData) {
        tableView.innerHTML = '';
        
        if (usersData.length === 0) {
            tableView.innerHTML = '<div class="text-center py-4"><p>No users found</p></div>';
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'table table-hover align-middle';
        
        // Table header
        const thead = document.createElement('thead');
        thead.className = 'table-light';
        thead.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Reg No</th>
                <th>Program</th>
                <th>College</th>
                <th>Rank</th>
                <th>Solved</th>
                <th>Gold</th>
                <th>Silver</th>
                <th>Bronze</th>
                <th>Total Points</th>
                <th>Actions</th>
            </tr>
        `;
        
        // Table body
        const tbody = document.createElement('tbody');
        
        usersData.forEach(item => {
            const user = item.user || item;
            const skillRackData = item.skillRackData || {};
            const basicInfo = skillRackData.basicInfo || {};
            const programmingSummary = skillRackData.programmingSummary || {};
            const medals = programmingSummary.medals || {};
            const programCounts = skillRackData.programCounts || {};
            const pointsCalculation = skillRackData.pointsCalculation || {};
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${basicInfo.name || 'N/A'}</td>
                <td>${user.registerNumber}</td>
                <td>${basicInfo.program || 'N/A'}</td>
                <td>${basicInfo.college || 'N/A'}</td>
                <td>${programmingSummary.rank || 'N/A'}</td>
                <td>${programCounts.programsSolved || 0}</td>
                <td><span class="medal-gold">${medals.gold || 0}</span></td>
                <td><span class="medal-silver">${medals.silver || 0}</span></td>
                <td><span class="medal-bronze">${medals.bronze || 0}</span></td>
                <td>${pointsCalculation.totalPoints || 0}</td>
                <td>
                    <a href="${user.skillRackURL}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                    <button class="btn btn-sm btn-info load-skillrack-btn" data-reg="${user.registerNumber}">
                        <i class="bi bi-arrow-repeat"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        table.appendChild(thead);
        table.appendChild(tbody);
        tableView.appendChild(table);
        
        // Add event listeners to the load buttons in table
        document.querySelectorAll('.load-skillrack-btn').forEach(button => {
            button.addEventListener('click', function() {
                const regNo = this.getAttribute('data-reg');
                fetchSingleSkillRackData(regNo);
            });
        });
    }
    
    function fetchSingleSkillRackData(registerNumber) {
        const dataContainer = document.querySelector(`#data-${registerNumber}`);
        if (dataContainer) {
            dataContainer.style.display = 'block';
            dataContainer.innerHTML = '<p>Loading data...</p>';
        }
        
        fetch(`/api/user/${registerNumber}`)
            .then(response => response.json())
            .then(data => {
                if (data.skillRackData) {
                    // Update the data in our stored array
                    const index = allUsersData.findIndex(item => 
                        (item.user?.registerNumber === registerNumber) || 
                        (item.registerNumber === registerNumber)
                    );
                    
                    if (index !== -1) {
                        allUsersData[index] = data;
                        // Update filtered data if this user is in it
                        const filteredIndex = filteredUsersData.findIndex(item => 
                            (item.user?.registerNumber === registerNumber) || 
                            (item.registerNumber === registerNumber)
                        );
                        if (filteredIndex !== -1) {
                            filteredUsersData[filteredIndex] = data;
                        }
                    }
                    
                    if (dataContainer) {
                        const skillRackData = data.skillRackData;
                        dataContainer.innerHTML = `
                            <div class="mt-3 alert alert-info">
                                <h5>${skillRackData.basicInfo.name}</h5>
                                <p><strong>Rank:</strong> ${skillRackData.programmingSummary.rank}</p>
                                <p><strong>Programs Solved:</strong> ${skillRackData.programCounts.programsSolved}</p>
                                <p><strong>Points:</strong> ${skillRackData.pointsCalculation.totalPoints}</p>
                            </div>
                        `;
                    }
                    
                    // Refresh the view to show updated data
                    updateView();
                } else {
                    if (dataContainer) {
                        dataContainer.innerHTML = '<div class="alert alert-danger">Failed to load SkillRack data</div>';
                    }
                }
            })
            .catch(error => {
                if (dataContainer) {
                    dataContainer.innerHTML = '<div class="alert alert-danger">Error loading data</div>';
                }
                console.error('Error:', error);
            });
    }
});