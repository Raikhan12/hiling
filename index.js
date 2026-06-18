let role = "guest";

const USERS = {
 admin: "admin123",
 member: "member123"
};

window.login = function(){
 const username=document.getElementById("username").value;
 const password=document.getElementById("password").value;

 if(USERS[username] && USERS[username]===password){
   role=username;
   finishLogin();
 }else{
   document.getElementById("error").innerText="Login gagal";
 }
};

window.guestLogin = function(){
 role="guest";
 finishLogin();
};

window.logout = function(){
 location.reload();
};

function finishLogin(){
 document.getElementById("loginPage").style.display="none";
 document.getElementById("app").classList.remove("hidden");
 applyRole();
}

function applyRole(){
 document.getElementById("roleText").innerText=role;

 document.querySelectorAll(".admin-only").forEach(el=>{
   el.style.display = role==="admin" ? "block":"none";
 });

 update();
}
