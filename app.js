/* Flashcards — add, edit, delete, and review cards, persisted in localStorage. */

const STORAGE_KEY = 'flashcards';

const form = document.getElementById('card-form');
const questionInput = document.getElementById('question');
const answerInput = document.getElementById('answer');
const errorMessage = document.getElementById('form-error');
const cardList = document.getElementById('card-list');
const emptyMessage = document.getElementById('empty-message');

const listView = document.getElementById('list-view');
const reviewView = document.getElementById('review-view');
const reviewButton = document.getElementById('review-button');
const reviewHeader = document.getElementById('review-header');
const reviewProgress = document.getElementById('review-progress');
const reviewCard = document.getElementById('review-card');
const reviewQuestion = document.getElementById('review-question');
const reviewAnswer = document.getElementById('review-answer');
const flipHint = document.getElementById('flip-hint');
const markButtons = document.getElementById('mark-buttons');
const knownButton = document.getElementById('known-button');
const learningButton = document.getElementById('learning-button');
const quitButton = document.getElementById('quit-button');
const reviewSummary = document.getElementById('review-summary');
const summaryText = document.getElementById('summary-text');
const exitButton = document.getElementById('exit-button');

let cards = loadCards();

// Review state — in memory only, discarded when review ends.
let reviewQueue = [];
let reviewIndex = 0;
let isFlipped = false;
let knownCount = 0;
let learningCount = 0;

// List state — at most one card is being edited or awaiting delete confirmation.
let editingIndex = null;
let pendingDeleteIndex = null;

function loadCards() {
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (err) {
    // Corrupted or unreadable data — start fresh rather than break the page.
    return [];
  }

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.filter(function (card) {
    return card && typeof card.question === 'string' && typeof card.answer === 'string';
  });
}

function saveCards() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (err) {
    showError('Could not save your cards in this browser.');
  }
}

function showError(message) {
  errorMessage.textContent = message;
}

function clearError() {
  errorMessage.textContent = '';
}

// Shared by the add form and the per-card edit form so both reject the same way.
function validateCardFields(question, answer) {
  if (!question && !answer) {
    return { message: 'Please fill in both a question and an answer.', field: 'question' };
  }

  if (!question) {
    return { message: 'Please fill in the question.', field: 'question' };
  }

  if (!answer) {
    return { message: 'Please fill in the answer.', field: 'answer' };
  }

  return null;
}

/* --- List --- */

function render() {
  cardList.textContent = '';

  cards.forEach(function (card, index) {
    cardList.appendChild(
      index === editingIndex ? buildEditRow(card, index) : buildCardRow(card, index)
    );
  });

  emptyMessage.classList.toggle('hidden', cards.length > 0);
  reviewButton.disabled = cards.length === 0;
}

function buildCardRow(card, index) {
  const item = document.createElement('li');
  item.className = 'card';

  const question = document.createElement('p');
  question.className = 'card-question';
  question.textContent = card.question;

  const answer = document.createElement('p');
  answer.className = 'card-answer';
  answer.textContent = card.answer;

  item.appendChild(question);
  item.appendChild(answer);
  item.appendChild(
    index === pendingDeleteIndex ? buildDeleteConfirm(index) : buildCardActions(index)
  );

  return item;
}

function buildCardActions(index) {
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'small secondary';
  editButton.textContent = 'Edit';
  editButton.addEventListener('click', function () {
    startEdit(index);
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'small secondary';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', function () {
    requestDelete(index);
  });

  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  return actions;
}

// Inline two-step confirmation, rather than window.confirm, so nothing is
// deleted on a single click and the page never blocks on a modal dialog.
function buildDeleteConfirm(index) {
  const wrap = document.createElement('div');
  wrap.className = 'card-confirm';

  const prompt = document.createElement('p');
  prompt.className = 'confirm-text';
  prompt.textContent = 'Delete this card? This cannot be undone.';

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'small danger';
  confirmButton.textContent = 'Yes, delete';
  confirmButton.addEventListener('click', function () {
    confirmDelete(index);
  });

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'small secondary cancel-delete';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', cancelDelete);

  actions.appendChild(confirmButton);
  actions.appendChild(cancelButton);
  wrap.appendChild(prompt);
  wrap.appendChild(actions);
  return wrap;
}

function buildEditField(labelText, value, id) {
  const field = document.createElement('div');
  field.className = 'field';

  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.textContent = labelText;

  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.value = value;
  input.autocomplete = 'off';

  field.appendChild(label);
  field.appendChild(input);
  return { field: field, input: input };
}

function buildEditRow(card, index) {
  const item = document.createElement('li');
  item.className = 'card';

  // A real form, so Enter saves the edit just as it adds a card above.
  const editForm = document.createElement('form');
  editForm.className = 'card-edit';
  editForm.noValidate = true;

  const questionField = buildEditField('Question', card.question, 'edit-question');
  const answerField = buildEditField('Answer', card.answer, 'edit-answer');

  const error = document.createElement('p');
  error.className = 'error';
  error.setAttribute('role', 'alert');

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.className = 'small';
  saveButton.textContent = 'Save';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'small secondary';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', cancelEdit);

  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);

  editForm.appendChild(questionField.field);
  editForm.appendChild(answerField.field);
  editForm.appendChild(error);
  editForm.appendChild(actions);

  editForm.addEventListener('submit', function (event) {
    event.preventDefault();
    saveEdit(index, questionField.input, answerField.input, error);
  });

  item.appendChild(editForm);
  return item;
}

function startEdit(index) {
  clearError();
  pendingDeleteIndex = null;
  editingIndex = index;
  render();

  const input = document.getElementById('edit-question');
  if (input) {
    input.focus();
    input.select();
  }
}

function cancelEdit() {
  editingIndex = null;
  render();
  questionInput.focus();
}

function saveEdit(index, questionField, answerField, errorElement) {
  const question = questionField.value.trim();
  const answer = answerField.value.trim();
  const problem = validateCardFields(question, answer);

  if (problem) {
    errorElement.textContent = problem.message;
    (problem.field === 'answer' ? answerField : questionField).focus();
    return;
  }

  cards[index] = { question: question, answer: answer };
  editingIndex = null;
  saveCards();
  render();
  questionInput.focus();
}

function requestDelete(index) {
  clearError();
  editingIndex = null;
  pendingDeleteIndex = index;
  render();

  // Focus Cancel, not the destructive button, so a stray keypress can't delete.
  const cancelButton = cardList.querySelector('.cancel-delete');
  if (cancelButton) {
    cancelButton.focus();
  }
}

function cancelDelete() {
  pendingDeleteIndex = null;
  render();
  questionInput.focus();
}

function confirmDelete(index) {
  cards.splice(index, 1);
  pendingDeleteIndex = null;
  editingIndex = null;
  saveCards();
  render();
  questionInput.focus();
}

function addCard() {
  const question = questionInput.value.trim();
  const answer = answerInput.value.trim();
  const problem = validateCardFields(question, answer);

  if (problem) {
    showError(problem.message);
    (problem.field === 'answer' ? answerInput : questionInput).focus();
    return;
  }

  clearError();
  cards.push({ question: question, answer: answer });
  saveCards();
  render();

  form.reset();
  questionInput.focus();
}

/* --- Review mode --- */

function startReview() {
  if (cards.length === 0) {
    return;
  }

  // Leave no half-finished edit or confirmation behind for when review ends.
  editingIndex = null;
  pendingDeleteIndex = null;

  // Snapshot the cards so the queue can't shift underneath the review.
  reviewQueue = cards.slice();
  reviewIndex = 0;
  isFlipped = false;
  knownCount = 0;
  learningCount = 0;

  reviewSummary.classList.add('hidden');
  reviewCard.classList.remove('hidden');
  reviewHeader.classList.remove('hidden');
  listView.classList.add('hidden');
  reviewView.classList.remove('hidden');

  renderReviewCard();
  reviewCard.focus();
}

function renderReviewCard() {
  const card = reviewQueue[reviewIndex];

  reviewProgress.textContent = 'Card ' + (reviewIndex + 1) + ' of ' + reviewQueue.length;
  reviewQuestion.textContent = card.question;
  reviewAnswer.textContent = card.answer;

  reviewAnswer.classList.toggle('hidden', !isFlipped);
  markButtons.classList.toggle('hidden', !isFlipped);
  flipHint.classList.toggle('hidden', isFlipped);
}

function flipCard() {
  if (isFlipped) {
    return;
  }

  isFlipped = true;
  renderReviewCard();
  knownButton.focus();
}

function markCard(wasKnown) {
  if (!isFlipped) {
    return;
  }

  if (wasKnown) {
    knownCount += 1;
  } else {
    learningCount += 1;
  }

  reviewIndex += 1;
  isFlipped = false;

  if (reviewIndex >= reviewQueue.length) {
    showSummary();
    return;
  }

  renderReviewCard();
  reviewCard.focus();
}

function showSummary() {
  const total = reviewQueue.length;

  // The summary has its own exit button, so drop the progress/Quit row entirely.
  reviewHeader.classList.add('hidden');
  reviewCard.classList.add('hidden');
  markButtons.classList.add('hidden');
  flipHint.classList.add('hidden');

  summaryText.textContent = 'Reviewed ' + total + (total === 1 ? ' card' : ' cards') +
    ' — ' + knownCount + ' known, ' + learningCount + ' still learning.';
  reviewSummary.classList.remove('hidden');
  exitButton.focus();
}

function exitReview() {
  reviewView.classList.add('hidden');
  listView.classList.remove('hidden');

  // Put the review pieces back to their starting visibility for the next run.
  reviewSummary.classList.add('hidden');
  reviewCard.classList.remove('hidden');
  reviewHeader.classList.remove('hidden');
  markButtons.classList.add('hidden');
  flipHint.classList.remove('hidden');
  reviewAnswer.classList.add('hidden');

  render();
  questionInput.focus();
}

/* --- Wiring --- */

// Handles both the button and Enter pressed in either text field.
form.addEventListener('submit', function (event) {
  event.preventDefault();
  addCard();
});

reviewButton.addEventListener('click', startReview);
reviewCard.addEventListener('click', flipCard);
knownButton.addEventListener('click', function () {
  markCard(true);
});
learningButton.addEventListener('click', function () {
  markCard(false);
});
quitButton.addEventListener('click', exitReview);
exitButton.addEventListener('click', exitReview);

document.addEventListener('keydown', function (event) {
  if (reviewView.classList.contains('hidden')) {
    return;
  }

  if (event.key !== ' ' && event.code !== 'Space') {
    return;
  }

  // Let a focused Known / Still learning / Quit button activate itself.
  const active = document.activeElement;
  if (active && active.tagName === 'BUTTON' && active !== reviewCard) {
    return;
  }

  event.preventDefault();
  flipCard();
});

render();
questionInput.focus();
