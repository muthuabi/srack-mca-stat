 document.addEventListener("DOMContentLoaded",(event)=>{
               const userContainer=document.getElementById("user-container");
               const userForm=document.getElementById("srack-url-form");
               const urlInput=document.getElementById("input-srack-url");
               const clearSaveBtn=document.createElement("button");
               const cardHead=document.getElementById("card-header");
               const statUpdateTime=document.getElementById('stat-updatedAt');
               const statUpdateTimeContainer=document.getElementById('stat-updatedAt-Container');
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
               statUpdateTime.innerText=localStorage.getItem("lastUpdatedSingle") || "Unknown";
               let URL;
               const loaderHTML=`   
               <div id="loadingIndicator" class="loading" style="display: flex;flex-direction:column;align-items:center;width:100%;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading data...</p>
                </div>`;

                clearSaveBtn.addEventListener("click",(e)=>{
                     if(localStorage.getItem("savedSrackURL"))
                     {
                        localStorage.removeItem("savedSrackURL");
                        fetchSRackData();
                     }

                })
                function storeUpdateTime()
                {
                    statUpdateTimeContainer.style.display='flex';
                    const date=new Date();
                    localStorage.setItem("lastUpdatedSingle",date.toLocaleString("en-GB",options));
                    statUpdateTime.innerText=date.toLocaleString("en-GB",options);
                }
               function fetchSRackData(message="")
               {
                     URL=urlInput?.value || localStorage.getItem("savedSrackURL") || null;
                     URL=URL?.trim();
                     userContainer.innerHTML=loaderHTML;
                     if(!URL)
                     {
                        userContainer.innerHTML=`<div class="mt-3 alert alert-warning"><strong>No URL FOUND</strong></div>`;
                        return;
                     }
                     fetch(`/api/user/srack-url?url=${btoa(URL)}`)
                     .then(res=>res.json())
                     .then(data=>{
                        // console.log(data);
                        // if(data?.skillRackData || null)
                        //    throw new Error("Some Error Occured");
                        userContainer.innerHTML=getUserDataCard(data.skillRackData,message);
                        localStorage.setItem("savedSrackURL",URL);
                        document.getElementById("reload-stat").addEventListener("click",reloadStat);
                        storeUpdateTime();
                     })
                     .catch(err=>{
                        // console.log(err);
                        userContainer.innerHTML=`<div class="mt-3 alert alert-danger"><strong>Failed to Load SkillRack Data (Invalid URL | Server Problem | Internet Issue)</strong></div>`;
                     })
                     .finally(()=>{
                           console.log("Fetch Completed");
                     });
                     console.log(URL);
               }
               if(localStorage.getItem("savedSrackURL"))
               {
                console.dir(clearSaveBtn);
                  clearSaveBtn.className='btn btn-outline-light';
                  clearSaveBtn.innerText='Clear Saved';
                  cardHead.appendChild(clearSaveBtn);
                  fetchSRackData(`<span>Welcome Back!</span>`);
               }

               userForm.addEventListener("submit",(e)=>{
                     e.preventDefault();
                     fetchSRackData();
               });
               function reloadStat()
               {
                  fetchSRackData(`<span>Stats Loaded | Updated !</span>`);
               }
               function getUserDataCard(skillRackData,message="")
               {
               const userCard = document.createElement('div');
               let languagesHTML = '';
                if (skillRackData.languageStats) {
                    for (const [lang, count] of Object.entries(skillRackData.languageStats)) {
                        languagesHTML += `<span class="badge bg-secondary badge-language">${lang.toUpperCase()}: ${count}</span>`;
                    }
                }
                userCard.innerHTML = `
                    <div class="user-card">
                        ${message}
                        <div class="d-flex justify-content-between align-items-start">

                            <div>
                                <h4>${skillRackData.basicInfo?.name || 'N/A'}</h4>
                                <p class="text-muted mb-1"><strong>Reg No:</strong> ${skillRackData.basicInfo?.registerNumber}</p>
                            </div>
                            <span class="badge rank-badge">Rank: ${skillRackData.programmingSummary?.rank || 'N/A'}</span>
                         
                        </div>
                        <button type='button' title="refresh" id="reload-stat"  class="btn btn-sm btn-info mt-2 load-skillrack-btn" data-reg="${skillRackData.basicInfo?.registerNumber}">
                            <i class="bi bi-arrow-repeat"></i>
                            Reload Stats
                        </button>
                        <div class="skillrack-data" id="data-${skillRackData.basicInfo?.registerNumber}" style="display: none;"></div>
                        <div class="my-2">
                            <p class="mb-1"><strong>Program:</strong> ${skillRackData.basicInfo?.program || 'N/A'}</p>
                            <p class="mb-1" style='white-space:nowrap;overflow: hidden;
  text-overflow: ellipsis;' title="${skillRackData.basicInfo?.college || 'N/A'}" ><strong>College: </strong>${skillRackData.basicInfo?.college || 'N/A'}</p>
                            <p class="mb-1"><strong>Year:</strong> ${skillRackData.basicInfo?.year || 'N/A'}</p>
                        </div>
                        
                        <a href="${skillRackData.basicInfo?.skillRackURL}" target="_blank" class="btn btn-sm btn-outline-primary mb-1">
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
                        <div class="accordion mt-3" id="accordion-${skillRackData.basicInfo?.registerNumber}">
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                                        data-bs-target="#collapse-${skillRackData.basicInfo?.registerNumber}" aria-expanded="false" 
                                        aria-controls="collapse-${skillRackData.basicInfo?.registerNumber}">
                                        Show Details
                                    </button>

                                </h2>
                                <div id="collapse-${skillRackData.basicInfo?.registerNumber}" class="accordion-collapse collapse" 
                                    data-bs-parent="#accordion-${skillRackData.basicInfo?.registerNumber}">
                                    <div class="accordion-body">
                                         <div class="stat-box">

                                            <h5><i class="bi bi-pencil-square"></i> Calculation</h5>
                                            <p><strong>Code Tutor:</strong> ${skillRackData.pointsCalculation?.codeTutor || 0}</p>
                                            <p><strong>Code Track:</strong> ${skillRackData.pointsCalculation?.codeTrack || 0}</p>
                                            <p><strong>DC</strong> ${skillRackData.pointsCalculation?.dc || 0}</p>
                                            <p><strong>DT:</strong> ${skillRackData.pointsCalculation?.dt || 0}</p>
                                            <p><strong>Code Test:</strong> ${skillRackData.pointsCalculation?.codeTest || 0}</p>
                                           
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
                return userCard.innerHTML;
               }



      });