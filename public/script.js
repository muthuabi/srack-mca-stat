document.addEventListener('DOMContentLoaded', function() {
    const usersContainer = document.getElementById('usersContainer');
    const tableView = document.getElementById('tableView');
    const loadAllBtn = document.getElementById('loadAllBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const viewToggle = document.getElementById('viewToggle');
    const statUpdateTime=document.getElementById('stat-updatedAt');
    let currentView = 'table'; // 'cards' or 'table'
    let allUsersData = []; // This will store all loaded data
    let filteredUsersData = []; // This will store filtered data for searches
    const options = {
                      weekday: 'long', 
                      year: 'numeric',
                      month: 'short',    
                      day: '2-digit',    
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true       
                    };
    statUpdateTime.innerText=localStorage.getItem("lastUpdated") || "Unknown";
    // Initialize toggle switch
    viewToggle.addEventListener('change', function() {
        currentView = this.checked ? 'cards' : 'table';
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
            // Get skillRackData or empty object if not available
            const aData = a.skillRackData || {};
            const bData = b.skillRackData || {};
            let aValue, bValue;
            if (field === "points") {
                // More robust points calculation access
                aValue = (typeof aData.pointsCalculation === 'object' && aData.pointsCalculation !== null) 
                    ? (aData.pointsCalculation.points || 0) 
                    : 0;
                bValue = (typeof bData.pointsCalculation === 'object' && bData.pointsCalculation !== null) 
                    ? (bData.pointsCalculation.points || 0) 
                    : 0;
            } else { // count
                // More robust program counts access
                aValue = (typeof aData.programCounts === 'object' && aData.programCounts !== null) 
                    ? (aData.programCounts.programsSolved || 0) 
                    : 0;
                bValue = (typeof bData.programCounts === 'object' && bData.programCounts !== null) 
                    ? (bData.programCounts.programsSolved || 0) 
                    : 0;
            }
            
            // console.log(`Sorting: aValue=${aValue}, bValue=${bValue}, field=${field}, order=${order}`);
            
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
        const searchTerm = searchInput.value.toLowerCase().trim();
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
    function getLocal(key="srack_data")
    {
        const data=localStorage.getItem("srack_data");
        if(!data)
            return false;
        allUsersData = JSON.parse(atob(data));
        filteredUsersData = [...allUsersData];
        updateView();
        return true;

    }
    function storeLocal(userData)
    {
        if(userData)
        {
        // console.log("Local Set");
        localStorage.setItem("srack_data",btoa(JSON.stringify(userData)));
        }
    }
    function storeUpdateTime()
    {
        const date=new Date();
        localStorage.setItem("lastUpdated",date.toLocaleString("en-GB",options));
        statUpdateTime.innerText=date.toLocaleString("en-GB",options);
    }
    function fetchBasicUserData() {
        if(getLocal())
            return;
        loadingIndicator.style.display = 'flex';
        usersContainer.style.display='none';
        fetch('/api/users')
            .then(response => response.json())
            .then(users => {
                // Initialize with basic user data (no SkillRack data yet)
                
                allUsersData = users.map(user => ({ user }));
                storeLocal(allUsersData);
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
        loadingIndicator.style.display = 'flex';
        usersContainer.style.display='none';
        fetch('/api/all-users-data')
            .then(response => response.json())
            .then(data => {
                allUsersData = data;
                storeLocal(allUsersData);
                storeUpdateTime();
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
        
        usersData.forEach((item,index) => {
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
                                <p class="text-muted mb-1"><strong>Reg No:</strong> ${user.registerNumber}</p>
                            </div>
                            <span class="badge rank-badge">Rank: ${skillRackData.programmingSummary?.rank || 'N/A'}</span>
                         
                        </div>
                        <button title="refresh" class="btn btn-sm btn-info mt-2 load-skillrack-btn" data-reg="${user.registerNumber}">
                            <i class="bi bi-arrow-repeat"></i>
                            Reload Stats
                        </button>
                        <div class="skillrack-data" id="data-${user.registerNumber}" style="display: none;"></div>
                        <div class="my-2">
                            <p class="mb-1"><strong>Program:</strong> ${skillRackData.basicInfo?.program || 'N/A'}</p>
                            <p class="mb-1" style='white-space:nowrap;overflow: hidden;
  text-overflow: ellipsis;' title="${skillRackData.basicInfo.college || 'N/A'}" ><strong>College: </strong>${skillRackData.basicInfo?.college || 'N/A'}</p>
                            <p class="mb-1"><strong>Year:</strong> ${skillRackData.basicInfo?.year || 'N/A'}</p>
                        </div>
                        
                        <a href="${user.skillRackURL}" target="_blank" class="btn btn-sm btn-outline-primary mb-1">
                            <i class="bi bi-box-arrow-up-right"></i> SkillRack Profile
                        </a>
                                                <br/>
                        <small class='text-primary'>* Constrainted with TCE Requirements</small>
                        <!-- Always visible important stats -->
                        <div class="stats-container">
                            <div class="stat-box">
                                <h5><i class="bi bi-code-square"></i> Programs Solved</h5>
                                <p class="fs-4 fw-bold" ${skillRackData.programCounts?.programsSolved>=2000 && "style='color:green'" } >${skillRackData.programCounts?.programsSolved || 0}</p>
                                ${skillRackData.programCounts?.programsSolved>=2000?"<small style='color:blue'>Requirements Completed</small>":"<small style='color:red' >"+(2000-skillRackData.programCounts?.programsSolved)+" Programs Remaing </small>"}
                            </div>
                            
                            <div class="stat-box">
                                <h5><i class="bi bi-graph-up"></i> Total Points</h5>
                                <p class="fs-4 fw-bold" ${skillRackData.pointsCalculation?.points>=5000 && "style='color:green'" } >${skillRackData.pointsCalculation?.totalPoints || 0}</p>
                                ${skillRackData.pointsCalculation?.points>=5000?"<small style='color:blue'>Requirements Completed</small>":"<small style='color:red' >"+(5000-skillRackData.pointsCalculation?.points)+" Points Remaining </small>"}
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

                                            <h5><i class="bi bi-pencil-square"></i> Calculation</h5>
                                            <p><strong>Code Tutor:</strong> ${skillRackData.pointsCalculation?.codeTutor || 0}</p>
                                            <p><strong>Code Track:</strong> ${skillRackData.pointsCalculation?.codeTrack || 0}</p>
                                            <p><strong>DC</strong> ${skillRackData.pointsCalculation?.dc || 0}</p>
                                            <p><strong>DT:</strong> ${skillRackData.pointsCalculation?.dt || 0}</p>
                                            <p><strong>Code Test:</strong> ${skillRackData.pointsCalculation?.codeTest || 0}</p>
                                            <p><strong>Total Points</strong> ${skillRackData.pointsCalculation?.totalPoints || 0}</p>
                                        </div>
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
                                            <p><strong>Code Tutor:</strong> ${skillRackData.programCounts?.codeTutor || 0}</p>
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
                <th class='not-important' >Program</th>
                <th class='not-important' >College</th>
                <th class='not-important' >Rank</th>
                <th>Solved</th>
                <th class='not-important' >Gold</th>
                <th class='not-important' >Silver</th>
                <th class='not-important' >Bronze</th>
                <th>Points</th>
                <th class='not-print'>Actions</th>
            </tr>
        `;
        
        // Table body
        const tbody = document.createElement('tbody');
        
        usersData.forEach((item,index) => {
            const user = item.user || item;
            const skillRackData = item.skillRackData || {};
            const basicInfo = skillRackData.basicInfo || {};
            const programmingSummary = skillRackData.programmingSummary || {};
            const medals = programmingSummary.medals || {};
            const programCounts = skillRackData.programCounts || {};
            const pointsCalculation = skillRackData.pointsCalculation || {};
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <!--<td class='d-flex gap-2' style="text-align:'right'"><strong>#${index+1}</strong> <span>${basicInfo.name || 'N/A'}</span></td>-->
                <td style='text-transform:uppercase'>${basicInfo.name || 'N/A'}</td>
                <td class='regno' >${user.registerNumber}</td>
                <td class='not-important' >${basicInfo.program || 'N/A'}</td>
                <td class='not-important' style='white-space:nowrap;max-width:10px;overflow: hidden;
  text-overflow: ellipsis;' title="${basicInfo.college || 'N/A'}">${basicInfo.college || 'N/A'}</td>
                <td class='not-important' >${programmingSummary.rank || 'N/A'}</td>
                <td ${programCounts?.programsSolved>=2000 && "style='color:green'" }  >${programCounts.programsSolved || 0}</td>
                <td class='not-important' ><span class="medal-gold">${medals.gold || 0}</span></td>
                <td class='not-important' ><span class="medal-silver">${medals.silver || 0}</span></td>
                <td class='not-important' ><span class="medal-bronze">${medals.bronze || 0}</span></td>
                <td ${pointsCalculation?.points>=5000 && "style='color:green'" } >${pointsCalculation.totalPoints || 0}</td>
                <td class='not-print'>
                <div style='display:flex;align-items:center;gap:2px'>
                    <a href="${user.skillRackURL}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                    <button title='Refresh Stats' id="data-${user.registerNumber}" class="btn rotLoader btn-sm btn-primary load-skillrack-btn" data-reg="${user.registerNumber}">
                        <i class="bi bi-arrow-repeat rotLoader" ></i>
                    </button>
                </div>
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
            if(dataContainer.classList.contains("rotLoader"))
                dataContainer.innerHTML="<small>Loading...</small>";
            else
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
                        storeLocal(allUsersData);
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
                        if(dataContainer.classList.contains("rotLoader"))
                            dataContainer.innerHTML="<small>Failed</small>";
                        else
                        dataContainer.innerHTML = '<small class="text-danger">Failed to load SkillRack Stat data</small>';
                    }
                }
            })
            .catch(error => {
                if (dataContainer) {
                    if(dataContainer.classList.contains("rotLoader"))
                        dataContainer.innerHTML="<small>Error</small>";
                    else
                    dataContainer.innerHTML = '<small class="text-danger">Error loading Stat data</small>';
                }
                console.error('Error:', error);
            });
    }
});