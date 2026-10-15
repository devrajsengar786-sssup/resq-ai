let installPrompt;
const button=document.querySelector('#install-app');
const dialog=document.querySelector('#install-help');
const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function sync(){button.hidden=installed();}
sync();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;sync();});
window.addEventListener('appinstalled',()=>{installPrompt=null;button.hidden=true;dialog.close();});
matchMedia('(display-mode: standalone)').addEventListener('change',sync);
button.addEventListener('click',async()=>{
 if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();await prompt.userChoice;}catch{dialog.showModal();}return;}
 dialog.showModal();
});
document.querySelector('#close-install').addEventListener('click',()=>dialog.close());
