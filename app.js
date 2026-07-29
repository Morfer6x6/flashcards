/* Flashcards — add cards, list them, review them, keep them in localStorage. */

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

function render() {
  cardList.textContent = '';

  cards.forEach(function (card) {
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
    cardList.appendChild(item);
  });

  emptyMessage.classList.toggle('hidden', cards.length > 0);
  reviewButton.disabled = cards.length === 0;
}

function addCard() {
  const question = questionInput.value.trim();
  const answer = answerInput.value.trim();

  if (!question && !answer) {
    showError('Please fill in both a question and an answer.');
    questionInput.focus();
    return;
  }

  if (!question) {
    showError('Please fill in the question.');
    questionInput.focus();
    return;
  }

  if (!answer) {
    showError('Please fill in the answer.');
    answerInput.focus();
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
