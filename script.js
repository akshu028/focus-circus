const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const screens = {
  landing: $("#landing"),
  timer: $("#timerScreen"),
  intermission: $("#intermissionScreen"),
  ovation: $("#ovationScreen"),
  stats: $("#statsScreen")
};

const audio = $("#bgMusic");

const state = {
  selectedMinutes: 25,
  remaining: 1500,
  currentAct: "",
  timer: null,
  breakRemaining: 300,
  breakTimer: null,
  done: 0,
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
  sound: true,
  stats: JSON.parse(localStorage.getItem("focusCircusStats") || '{"sessions":[]}')
};

function show(name) {
  Object.values(screens).forEach((screen) => {
    screen.classList.remove("active");
  });

  screens[name].classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (name === "stats") {
    renderStats();
  }
}

function fmt(seconds) {
  seconds = Math.max(0, seconds);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0")
  );
}

function updateTimer() {
  $("#timerDisplay").textContent = fmt(state.remaining);
}

function updateBreak() {
  $("#breakDisplay").textContent = fmt(state.breakRemaining);
}

function stopTimer() {
  clearInterval(state.timer);
  state.timer = null;
}

function stopBreak() {
  clearInterval(state.breakTimer);
  state.breakTimer = null;
}

function save() {
  localStorage.setItem(
    "focusCircusStats",
    JSON.stringify(state.stats)
  );
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/* ---------------- LANDING ---------------- */

$("#enterShow").onclick = () => {
  show("timer");
};

$("#backLandingBtn").onclick = () => {
  stopTimer();
  show("landing");
};

$("#showStatsBtn").onclick = () => {
  show("stats");
};

$("#newActBtn").onclick = () => {
  show("timer");
};

$("#statsNewActBtn").onclick = () => {
  show("timer");
};

$("#ovationStatsBtn").onclick = () => {
  show("stats");
};

/* ---------------- SOUND ---------------- */

$("#soundBtn").onclick = async () => {
  state.sound = !state.sound;

  if (state.sound) {
    try {
      audio.muted = false;
      await audio.play();
    } catch (error) {
      console.log("Audio needs user interaction first.");
    }

    $("#soundBtn").innerHTML =
      "🔊 SOUND<br><b>ON</b>";
  } else {
    audio.pause();

    $("#soundBtn").innerHTML =
      "🔇 SOUND<br><b>OFF</b>";
  }
};

/* ---------------- ACT SELECTION ---------------- */

let pending = null;

$$(".act[data-minutes]").forEach((button) => {
  button.onclick = () => {
    pending = {
      minutes: Number(button.dataset.minutes),
      label: button.dataset.label
    };

    $("#actNameInput").value = "";
    $("#actModal").classList.add("show");

    setTimeout(() => {
      $("#actNameInput").focus();
    }, 50);
  };
});

$("#confirmActBtn").onclick = () => {
  if (!pending) return;

  state.selectedMinutes = pending.minutes;
  state.remaining = pending.minutes * 60;
  state.done = 0;

  state.currentAct =
    $("#actNameInput").value.trim() || pending.label;

  $("#currentAct").textContent =
    "🎥 CURRENT ACT: " + state.currentAct;

  $("#timerBubble").innerHTML =
    `READY FOR <b>${state.currentAct.toUpperCase()}</b>?<br>
     THE AUDIENCE IS WATCHING.`;

  $("#startBtn").textContent = "▶ START";

  updateTimer();

  $("#actModal").classList.remove("show");

  show("timer");
};

$("#cancelActBtn").onclick = () => {
  $("#actModal").classList.remove("show");
};

/* ---------------- TIMER ---------------- */

$("#startBtn").onclick = () => {
  if (!state.currentAct) {
    alert("Pick and name an act first.");
    return;
  }

  if (state.timer) return;

  $("#startBtn").textContent = "▶ RUNNING";

  state.timer = setInterval(() => {
    state.remaining--;
    state.done++;

    updateTimer();

    if (state.remaining <= 0) {
      stopTimer();
      finish(false);
    }
  }, 1000);
};

$("#resetBtn").onclick = () => {
  stopTimer();

  state.remaining = state.selectedMinutes * 60;
  state.done = 0;

  $("#startBtn").textContent = "▶ START";

  updateTimer();
};

$("#endEarlyBtn").onclick = () => {
  if (!state.currentAct) {
    alert("Choose an act first.");
    return;
  }

  stopTimer();
  finish(true);
};

/* ---------------- STREAK ---------------- */

function streak() {
  const days = [
    ...new Set(state.stats.sessions.map((session) => session.date))
  ]
    .sort()
    .reverse();

  if (!days.length) return 0;

  let count = 0;

  let current = new Date();
  current.setHours(0, 0, 0, 0);

  for (const key of days) {
    const day = new Date(key + "T00:00:00");

    const difference = Math.round(
      (current - day) / 86400000
    );

    if (
      difference === 0 ||
      (count > 0 && difference === 1)
    ) {
      count++;
      current = day;
    } else if (count === 0 && difference === 1) {
      count++;
      current = day;
    } else {
      break;
    }
  }

  return count;
}

/* ---------------- FINISH ACT ---------------- */

function finish(early) {
  const minutes = Math.max(
    1,
    early ? state.done : state.selectedMinutes
  );

  state.stats.sessions.push({
    date: dateKey(),
    minutes: minutes,
    act: state.currentAct,
    early: early
  });

  save();

  $("#ovationMessage").textContent = early
    ? "🎭 ACT ENDED EARLY — YOU STILL SHOWED UP!"
    : "🎭 ACT COMPLETE!";

  $("#ovationTime").innerHTML =
    `${minutes} MINUTES<br>OF PURE FOCUS`;

  $("#badgeMinutes").textContent =
    minutes + " MIN";

  $("#badgeStreak").textContent =
    "STREAK +" + streak();

  $("#startBtn").textContent = "▶ START";

  confetti();

  show("ovation");
}

/* ---------------- INTERMISSION ---------------- */

$("#intermissionBtn").onclick = () => {
  stopTimer();

  state.breakRemaining = 300;

  updateBreak();

  $("#breakStartBtn").textContent =
    "▶ START BREAK";

  show("intermission");
};

$("#breakStartBtn").onclick = () => {
  if (state.breakTimer) return;

  $("#breakStartBtn").textContent =
    "▶ BREAK RUNNING";

  state.breakTimer = setInterval(() => {
    state.breakRemaining--;

    updateBreak();

    if (state.breakRemaining <= 0) {
      stopBreak();

      $("#breakStartBtn").textContent =
        "▶ START BREAK";

      alert(
        "Intermission is over. Back to the show!"
      );

      show("timer");
    }
  }, 1000);
};

$("#breakResetBtn").onclick = () => {
  stopBreak();

  state.breakRemaining = 300;

  updateBreak();

  $("#breakStartBtn").textContent =
    "▶ START BREAK";
};

$("#backShowBtn").onclick = () => {
  stopBreak();
  show("timer");
};

/* ---------------- MODALS ---------------- */

$$("[data-open]").forEach((button) => {
  button.onclick = () => {
    $("#" + button.dataset.open)
      .classList.add("show");
  };
});

$$(".close").forEach((button) => {
  button.onclick = () => {
    button.closest(".modal")
      .classList.remove("show");
  };
});

$$(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("show");
    }
  });
});

/* ---------------- CONFETTI ---------------- */

function confetti() {
  const layer = $("#confetti-layer");

  const colors = [
    "#e92935",
    "#ffbf2e",
    "#2779b2",
    "#f18bd0",
    "#fff3c7",
    "#ff7b34"
  ];

  for (let i = 0; i < 180; i++) {
    const piece = document.createElement("i");

    piece.className = "confetti";

    piece.style.left =
      Math.random() * 100 + "%";

    piece.style.background =
      colors[
        Math.floor(Math.random() * colors.length)
      ];

    piece.style.animationDelay =
      Math.random() * 0.8 + "s";

    layer.appendChild(piece);

    setTimeout(() => {
      piece.remove();
    }, 3800);
  }
}

/* ---------------- STATS ---------------- */

function total() {
  return state.stats.sessions.reduce(
    (total, session) =>
      total + session.minutes,
    0
  );
}

function best() {
  const days = {};

  state.stats.sessions.forEach((session) => {
    days[session.date] =
      (days[session.date] || 0) +
      session.minutes;
  });

  return Math.max(
    0,
    ...Object.values(days)
  );
}

function renderStats() {
  $("#totalShowtime").textContent =
    total() + " MIN";

  $("#actsDone").textContent =
    String(state.stats.sessions.length)
      .padStart(2, "0");

  $("#rollDays").textContent =
    streak() + " DAYS";

  $("#bestDay").textContent =
    best() + " MIN";

  const first = new Date(
    state.year,
    state.month,
    1
  );

  const days = new Date(
    state.year,
    state.month + 1,
    0
  ).getDate();

  const offset =
    (first.getDay() + 6) % 7;

  $("#monthLabel").textContent =
    first
      .toLocaleString("en-US", {
        month: "long",
        year: "numeric"
      })
      .toUpperCase();

  const calendar = $("#calendar");

  calendar.innerHTML = "";

  for (let i = 0; i < offset; i++) {
    const empty = document.createElement("div");

    empty.className = "empty";

    calendar.appendChild(empty);
  }

  const today = dateKey();

  for (let day = 1; day <= days; day++) {
    const cell = document.createElement("div");

    const key =
      `${state.year}-${String(
        state.month + 1
      ).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;

    const minutes =
      state.stats.sessions
        .filter((session) => session.date === key)
        .reduce(
          (total, session) =>
            total + session.minutes,
          0
        );

    cell.innerHTML =
      `<span>${day}</span>` +
      (minutes
        ? `<small>${minutes}m</small>`
        : "");

    if (minutes) {
      cell.classList.add("has-focus");
    }

    if (key === today) {
      cell.classList.add("today");
    }

    calendar.appendChild(cell);
  }
}

$("#prevMonth").onclick = () => {
  state.month--;

  if (state.month < 0) {
    state.month = 11;
    state.year--;
  }

  renderStats();
};

$("#nextMonth").onclick = () => {
  state.month++;

  if (state.month > 11) {
    state.month = 0;
    state.year++;
  }

  renderStats();
};

/* ---------------- INITIALIZE ---------------- */

updateTimer();
updateBreak();
renderStats();