console.log('Dashboard initialized');
function openTab(tab){
  document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
  document.querySelector(`button[onclick="openTab('${tab}')"]`).classList.add('active');
  console.log('Switched to tab:', tab);
}
