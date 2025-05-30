document.addEventListener("DOMContentLoaded",(function(){console.log("Admin Users Management loaded");let e=[],t=1,n=0,a={search:"",status:"",level:""},o=null,s=!1;const r=document.getElementById("user-table-body"),i=document.getElementById("pagination-container"),l=document.getElementById("user-search"),d=document.getElementById("status-filter"),c=document.getElementById("level-filter"),u=document.getElementById("reset-filters"),m=document.getElementById("user-form"),p=document.getElementById("save-user-btn"),g=document.getElementById("confirm-action-btn"),h=document.getElementById("add-user-btn");function f(){try{const e=localStorage.getItem("patriotThanksSession");if(!e)return console.error("No session data found"),null;const t=JSON.parse(e);return t.token?t.token:(console.error("No token found in session data"),null)}catch(e){return console.error("Error retrieving auth token:",e),null}}function v(){window.location.href="/login.html?expired=true&redirect="+encodeURIComponent(window.location.pathname)}function v(){window.location.href="/index.html?login=required&redirect="+encodeURIComponent(window.location.pathname)}function w(){document.querySelector(".admin-container").innerHTML='\n            <div class="alert alert-danger" role="alert">\n                <h4 class="alert-heading">Access Denied</h4>\n                <p>You do not have permission to access this page. Only administrators can access the user management dashboard.</p>\n                <hr>\n                <p class="mb-0">Please <a href="/index.html">return to the homepage</a> or contact an administrator if you believe this is an error.</p>\n            </div>\n        '}async function y(){try{r.innerHTML='<tr><td colspan="7" class="text-center">Loading users...</td></tr>';const o="localhost"===window.location.hostname||"127.0.0.1"===window.location.hostname?`http://${window.location.host}`:window.location.origin,s=f();if(!s)throw new Error("Authentication required");let i=new URLSearchParams({operation:"list-users",page:t,limit:10});a.search&&i.append("search",a.search),a.status&&i.append("status",a.status),a.level&&i.append("level",a.level),console.log("Fetching users with query:",i.toString());const l=await fetch(`${o}/api/auth.js?${i.toString()}`,{method:"GET",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`}});if(401===l.status)return void(window.location.href="/login.html?expired=true&redirect="+encodeURIComponent(window.location.pathname));if(!l.ok){const e=await l.text();throw console.error("API response:",l.status,e),new Error(`Failed to load users: ${l.status} ${l.statusText}`)}const d=await l.json();e=d.users||[],n=d.totalPages||1,totalItems=d.total||0,function(e){const t=document.querySelector(".admin-header h2");if(t){const n=t.textContent.split(" ").slice(0,2).join(" ");t.innerHTML=`${n} <span class="badge badge-info">${e} total</span>`}}(totalItems),E(),b()}catch(t){console.error("Error loading users:",t),r.innerHTML=`<tr><td colspan="7" class="text-center text-danger">Error loading users: ${t.message}</td></tr>`,e=[{_id:"1",fname:"Admin",lname:"User",email:"admin@example.com",city:"Cedar Rapids",state:"IA",status:"AD",level:"Admin",created_at:(new Date).toISOString()}],n=1,E(),b()}}function E(){0!==e.length?(r.innerHTML="",e.forEach((e=>{const t=document.createElement("tr");let n,a="N/A";e.created_at&&(a=`${new Date(e.created_at).toLocaleDateString()}`);let o,s="Unknown";switch(e.status){case"VT":n='<span class="badge badge-active">Veteran</span>',s="Veteran";break;case"AD":n='<span class="badge badge-active">Active-Duty</span>',s="Active-Duty";break;case"FR":n='<span class="badge badge-active">First Responder</span>',s="First Responder";break;case"SP":n='<span class="badge badge-active">Spouse</span>',s="Spouse";break;case"BO":n='<span class="badge badge-active">Business Owner</span>',s="Business Owner";break;case"SU":n='<span class="badge badge-active">Supporter</span>',s="Supporter";break;default:n='<span class="badge badge-secondary">Unknown</span>'}switch(e.level){case"Free":o='<span class="badge badge-free">Free</span>';break;case"Basic":o='<span class="badge badge-basic">Basic</span>';break;case"Premium":o='<span class="badge badge-premium">Premium</span>';break;case"VIP":o='<span class="badge badge-vip">V.I.P.</span>';break;case"Admin":o='<span class="badge badge-admin">Admin</span>';break;default:o='<span class="badge badge-secondary">Unknown</span>'}t.innerHTML=`\n                <td>${e.fname||""} ${e.lname||""}</td>\n                <td>${e.email||"N/A"}</td>\n                <td>${e.city?e.city+", "+e.state:"N/A"}</td>\n                <td>${n}</td>\n                <td>${o}</td>\n                <td>${a}</td>\n                <td>\n                    <div class="action-buttons">\n                        <button class="btn btn-sm btn-info edit-user" data-id="${e._id}">Edit</button>\n                        <button class="btn btn-sm btn-danger delete-user" data-id="${e._id}" data-name="${e.fname} ${e.lname}">Delete</button>\n                    </div>\n                </td>\n            `,r.appendChild(t)})),document.querySelectorAll(".edit-user").forEach((t=>{t.addEventListener("click",(function(){!function(t){const n=e.find((e=>e._id===t));n?(document.getElementById("user-id").value=n._id,document.getElementById("fname").value=n.fname||"",document.getElementById("lname").value=n.lname||"",document.getElementById("email").value=n.email||"",document.getElementById("address1").value=n.address1||"",document.getElementById("address2").value=n.address2||"",document.getElementById("city").value=n.city||"",document.getElementById("state").value=n.state||"",document.getElementById("zip").value=n.zip||"",document.getElementById("status").value=n.status||"",document.getElementById("level").value=n.level||"",document.getElementById("password").value="",document.getElementById("confirm-password").value="",document.getElementById("password").nextElementSibling.style.display="block",o=n._id,document.getElementById("userModalLabel").textContent="Edit User",window.ModalHelper.show("userModal")):console.error("User not found:",t)}(this.getAttribute("data-id"))}))})),document.querySelectorAll(".delete-user").forEach((e=>{e.addEventListener("click",(function(){var e,t;e=this.getAttribute("data-id"),t=this.getAttribute("data-name"),o=e,document.getElementById("confirmation-message").textContent=`Are you sure you want to delete the user ${t||"selected user"}?`,document.getElementById("confirm-action-btn").textContent="Delete",$("#confirmationModal").modal("show")}))}))):r.innerHTML='<tr><td colspan="7" class="text-center">No users found</td></tr>'}function b(){if(i.innerHTML="",n<=1)return;const e=document.createElement("li"),a=document.createElement("a");a.href="#",a.textContent="Previous",a.classList.add(1===t?"disabled":""),a.addEventListener("click",(function(e){e.preventDefault(),t>1&&(t--,y())})),e.appendChild(a),i.appendChild(e);let o=Math.max(1,t-2),s=Math.min(n,o+4);s-o<4&&(o=Math.max(1,s-4));for(let e=o;e<=s;e++){const n=document.createElement("li"),a=document.createElement("a");a.href="#",a.textContent=e,e===t&&a.classList.add("active"),a.addEventListener("click",(function(n){n.preventDefault(),t=e,y()})),n.appendChild(a),i.appendChild(n)}const r=document.createElement("li"),l=document.createElement("a");l.href="#",l.textContent="Next",l.classList.add(t===n?"disabled":""),l.addEventListener("click",(function(e){e.preventDefault(),t<n&&(t++,y())})),r.appendChild(l),i.appendChild(r)}(async function(){try{const e=f();if(!e)return console.error("No auth token found"),v(),!1;const t="localhost"===window.location.hostname||"127.0.0.1"===window.location.hostname?`http://${window.location.host}`:window.location.origin;console.log("Verifying token with URL:",`${t}/api/auth.js?operation=verify-token\``);try{const n=await fetch(`${t}/api/auth.js?operation=verify-token`,{method:"GET",headers:{Authorization:`Bearer ${e}`,"Cache-Control":"no-cache"}});if(console.log("Verify token response status:",n.status),404===n.status){console.error("Verify token endpoint not found - using fallback validation");try{const e=localStorage.getItem("patriotThanksSession");if(e){const t=JSON.parse(e);if(console.log("Session data:",t),"Admin"===t.userLevel)return console.log("Using fallback admin validation based on local session data"),alert("Warning: Using local validation as API endpoint is unavailable. Limited functionality may be available."),!0}}catch(e){console.error("Fallback validation failed:",e)}return alert("Cannot verify admin status. API endpoint not found."),!1}if(!n.ok)return console.error("Verify token error:",n.status),401===n.status&&(v(),!1);const a=await n.json();return console.log("Verification response data:",a),s=!0===a.isAdmin||"Admin"===a.level,console.log("Admin access verified:",s),s}catch(e){return console.error("API test error:",e),console.log("Bypassing verification for development"),alert("Warning: API error encountered. Using development mode access."),!0}}catch(e){return console.error("Error in admin status check:",e),!1}})().then((e=>{e?(y(),l.addEventListener("input",function(e){let t;return function(){const n=this,a=arguments;clearTimeout(t),t=setTimeout((()=>{e.apply(n,a)}),300)}}((function(){a.search=this.value,t=1,y()}))),d.addEventListener("change",(function(){a.status=this.value,t=1,y()})),c.addEventListener("change",(function(){a.level=this.value,t=1,y()})),u.addEventListener("click",(function(){l.value="",d.value="",c.value="",a.search="",a.status="",a.level="",t=1,y()})),h.addEventListener("click",(function(){m.reset(),o=null,document.getElementById("userModalLabel").textContent="Add New User",document.getElementById("password").nextElementSibling.style.display="none",window.ModalHelper.show("userModal")})),p.addEventListener("click",(function(){event.preventDefault(),function(){const e=document.getElementById("fname").value.trim(),t=document.getElementById("lname").value.trim(),n=document.getElementById("email").value.trim(),a=document.getElementById("status").value,s=document.getElementById("level").value,r=document.getElementById("password").value,i=document.getElementById("confirm-password").value;if(!e)return alert("First name is required"),!1;if(!t)return alert("Last name is required"),!1;if(!n)return alert("Email is required"),!1;if(!function(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}(n))return alert("Please enter a valid email address"),!1;if(!a)return alert("Status is required"),!1;if(!s)return alert("Membership level is required"),!1;if(!o||o&&r){if(!o&&!r)return alert("Password is required for new users"),!1;if(r){if(r!==i)return alert("Passwords do not match"),!1;if("function"==typeof window.validatePassword){const e=window.validatePassword(r);if(!e.isValid){let t="Password must contain:\n";const n=e.criteria;return n.hasLower||(t+="- At least one lowercase letter\n"),n.hasUpper||(t+="- At least one uppercase letter\n"),n.hasNumber||(t+="- At least one number\n"),n.hasSpecial||(t+="- At least one special character (!@#$%^&*)\n"),n.hasLength||(t+="- At least 8 characters\n"),alert(t),!1}}else if(r.length<8)return alert("Password must be at least 8 characters long"),!1}}return!0}()&&async function(){try{const e={fname:document.getElementById("fname").value.trim(),lname:document.getElementById("lname").value.trim(),email:document.getElementById("email").value.trim(),address1:document.getElementById("address1").value.trim(),address2:document.getElementById("address2").value.trim(),city:document.getElementById("city").value.trim(),state:document.getElementById("state").value,zip:document.getElementById("zip").value.trim(),status:document.getElementById("status").value,level:document.getElementById("level").value},t=document.getElementById("password").value;t&&""!==t.trim()&&(e.password=t);const n=!!o;n&&(e.userId=o);const a="localhost"===window.location.hostname||"127.0.0.1"===window.location.hostname?`http://${window.location.host}`:window.location.origin,s=f();if(!s)return void v();const r=`${a}/api/auth.js?operation=${n?"update-user":"register"}`;console.log(`${n?"UPDATE":"CREATE"} request to ${r}`,e);const i=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify(e)});if(401===i.status)return void v();if(!i.ok){const e=await i.text();console.error("Error response:",e);try{const t=JSON.parse(e);throw new Error(t.message||`Error: ${i.status} ${i.statusText}`)}catch(e){throw new Error(`Error: ${i.status} ${i.statusText}`)}}const l=await i.json();console.log("Save user response:",l),window.ModalHelper.hide("userModal"),alert(n?"User updated successfully!":"User created successfully!"),y()}catch(e){console.error("Error saving user:",e),alert(`Error saving user: ${e.message}`)}}()})),g.addEventListener("click",(function(){!async function(){if(o)try{const e="localhost"===window.location.hostname||"127.0.0.1"===window.location.hostname?`http://${window.location.host}`:window.location.origin,t=f();if(!t)return void v();const n=`${e}/api/auth.js?operation=delete-user`;console.log(`DELETE operation for user ${o}`);const a=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({userId:o})});if(401===a.status)return void v();if(!a.ok){const e=await a.text();console.error("Error response:",e);try{const t=JSON.parse(e);throw new Error(t.message||`Error: ${a.status} ${a.statusText}`)}catch(e){throw new Error(`Error: ${a.status} ${a.statusText}`)}}const s=await a.json();console.log("Delete user response:",s),$("#confirmationModal").modal("hide"),alert("User deleted successfully!"),o=null,y()}catch(e){console.error("Error deleting user:",e),alert(`Error deleting user: ${e.message}`)}else console.error("No user selected for deletion")}()}))):w()})).catch((e=>{console.error("Error during initialization:",e),w()}))}));