document.addEventListener('DOMContentLoaded', function () {
  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  function showTab(tab) {
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    tabContents.forEach(content => content.classList.toggle('active', content.id === 'tab-' + tab));
  }
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
  // Default to Original tab
  showTab('original');

  // Modal logic
  const modalBg = document.getElementById('modal-bg');
  const modal = document.getElementById('endorse-flag-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalNote = document.getElementById('modal-note');
  const modalCancel = document.getElementById('modal-cancel');
  const modalClose = document.getElementById('modal-close');
  const modalSubmit = document.getElementById('modal-submit');
  let currentAction = null;

  function openModal(action) {
    currentAction = action;
    modalTitle.textContent = action === 'endorse' ? 'Endorse Document' : 'Flag Document';
    modalNote.value = '';
    modal.classList.remove('hidden');
    modalBg.classList.remove('hidden');
    modalNote.focus();
  }
  function closeModal() {
    modal.classList.add('hidden');
    modalBg.classList.add('hidden');
    currentAction = null;
  }
  if (modalCancel) modalCancel.onclick = closeModal;
  if (modalBg) modalBg.onclick = closeModal;
  if (modalClose) modalClose.onclick = closeModal;

  // Endorse/Flag button handlers
  const endorseBtn = document.getElementById('endorse-btn');
  const flagBtn = document.getElementById('flag-btn');
  if (endorseBtn) endorseBtn.onclick = () => openModal('endorse');
  if (flagBtn) flagBtn.onclick = () => openModal('flag');

  // Modal submit
  if (modalSubmit) {
    modalSubmit.onclick = async function () {
      const note = modalNote.value.trim();
      if (!note) {
        modalNote.classList.add('border-red-500');
        modalNote.placeholder = 'Note is required!';
        return;
      }
      modalNote.classList.remove('border-red-500');
      const docId = window.location.pathname.split('/').pop();
      const url = `/api/documents/${docId}/${currentAction}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note })
        });
        if (res.ok) {
          window.location.reload();
        } else {
          const err = await res.json();
          alert('Error: ' + (err.error || 'Failed to submit'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    };
  }
}); 