import { plural } from './lib/best';

// Every user-facing string in the app, grouped by screen.
// Validation and API error messages live in shared/validate.ts and server/, since the server uses them too.
// A string with a bold lead-in is split into { lead, rest } so the markup stays in the component.

export const copy = {
  brand: 'socialcal',

  topBar: {
    help: 'How socialcal works',
    new: 'New',
    share: 'Share',
  },

  helpLink: 'How it works',

  create: {
    title: 'Create your calendar',
    lede: 'Name the plan, pick the window, and share the link to find a day that works.',
    yourName: 'Your name',
    yourNamePlaceholder: "So friends know it's you",
    submit: 'Create calendar',
    submitting: 'Creating…',
    networkError: "Couldn't create the calendar. Check your connection and try again.",
  },

  eventFields: {
    plan: "What's the plan?",
    planPlaceholder: 'e.g. Dinner at that new restaurant',
    description: 'Description',
    descriptionPlaceholder: 'Optional: where, how long, anything people should know',
    from: 'From',
    to: 'To',
  },

  ready: {
    title: 'Your calendar is ready',
    sub: 'Share the link with friends so they can add their availability.',
    shareLabel: 'Share link',
    editLabel: 'Private edit link',
    copy: 'Copy',
    copied: 'Copied',
    editHelp: "Bookmark this. It's the only way to edit this event or your days from another device.",
    done: 'Done',
  },

  event: {
    loading: 'Loading…',
    createdBy: 'Created by',
    edit: 'Edit event',
    tabAll: 'All days',
    tabBest: 'Best days',
    saveRetrying: "Couldn't save, retrying…",
  },

  marking: {
    for: 'Marking days for',
    days: (n: number) => `${n} ${plural(n, 'day', 'days')}`,
    changeName: 'Change name',
    viewOnly: 'Viewing only',
    addDays: 'Add my availability',
  },

  calendar: {
    weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    legendMine: 'Your days',
    legendTally: 'One mark per person free',
    legendNumber: 'People free that day',
    legendBest: 'Most people free',
    legendSelectable: 'Tap to mark',
    legendOut: 'Outside the dates',
    // Screen reader label for a day button. `date` comes from formatDayLong.
    // `best` mirrors the red circle.
    dayLabel: (date: string, count: number, total: number, best = false) =>
      (count && total ? `${date}, ${count} of ${total} ${plural(total, 'person', 'people')} free` : `${date}, nobody free yet`) +
      (best ? ', best day' : ''),
  },

  join: {
    sub: 'Enter your name and select your availability to find the best day to meet.',
    submit: 'Continue',
    look: 'Just browse',
  },

  rename: {
    title: 'Change your name',
    sub: 'This is how you show up to everyone.',
    submit: 'Save',
    cancel: 'Cancel',
  },

  editEvent: {
    title: 'Edit event',
    sub: 'Only you can change these.',
    cancel: 'Cancel',
    save: 'Save',
  },

  best: {
    aloneTitle: 'Nobody else yet',
    aloneBody: 'Best days show up once others add their availability.',
    addDaysTitle: 'Add your days',
    addDaysBody: "Best days show up once you mark the days you're free.",
    share: 'Share the link',
    noMajorityTitle: 'No day works for half the group yet',
    noMajorityMax: (max: number, total: number) => `The most overlap so far is ${max} of ${total}.`,
    noMajorityCreator: 'Nudge people to add more availability, or widen the date range.',
    noMajorityFriend: 'Nudge people to add more availability.',
    editDates: 'Edit date range',
    showClosest: 'Show closest days anyway',
    hideClosest: 'Hide closest days',
    closest: (n: number) => plural(n, 'Closest day so far', 'Closest days so far'),
    best: (n: number) => plural(n, 'Best day', 'Best days'),
    noOthers: 'No other days work for at least half the group.',
    next: (n: number) => plural(n, 'Next best day', 'Next best days'),
    seeOthers: (n: number) => `See ${n} other ${plural(n, 'day', 'days')}`,
    hideOthers: 'Hide other days',
    cardCount: (count: number, total: number) => `${count} of ${total}`,
    subtitle: (count: number, total: number) => `${count} of ${total} people available`,
    you: 'You',
    notFree: ' (not free)', // visually hidden after a struck-through name
  },

  help: {
    title: 'How socialcal works',
    sub: 'Find a day that works for a group, without a group chat full of dates.',
    planHeading: 'Create a plan',
    create: 'One person creates a calendar with a date window.',
    share: { before: 'They ', lead: 'share', rest: ' the link with everyone they want to invite.' },
    markHeading: 'Find the best day to meet',
    tap: { lead: 'Tap', rest: " a day you're free. Tap again to unmark it." },
    drag: { lead: 'Drag', rest: ' across days to mark several at once.' },
    dragTouch: { lead: 'Press and hold', rest: ', then drag to mark several days.' },
    keyboard: { lead: 'Use the arrow keys', rest: ' to navigate between days and enter or space to toggle the selected date.' },
    highlight: 'Your days get a yellow highlight.',
    circle: 'The days with the most people free get circled.',
    bestDays: { lead: 'Best days', rest: ' ranks the days that work for the most people.' },
    noSignUp: 'No sign-up or accounts. Just share the link.',
    aboutHeading: 'About',
    about: {
      builtBy: 'socialcal is built by',
      author: 'Jorge Mir Alvarez',
      authorUrl: 'https://jmiralva.me',
      openSource: 'and open source on',
      github: 'GitHub',
      repoUrl: 'https://github.com/jmiralva/socialcal',
    },
    done: 'Got it',
  },

  messages: {
    linkCopied: 'Link copied',
    copyFailed: "Couldn't copy the link",
    cantEdit: "This browser can't edit this event. Use your private edit link.",
    offline: "Couldn't save. Check your connection and try again.",
    cookiesBlocked: "Cookies are blocked, so this browser can't remember you.",
    editLinkInvalid: "That edit link didn't work for this calendar.",
    editLinkOffline: "Couldn't check your edit link. Reload this page to try again.",
    daysLocked: "This browser can't change these days anymore.",
    daysFailed: (reason: string) => `Couldn't save your days: ${reason}`,
    loadTitle: "Couldn't load this calendar",
    loadBody: 'Check your connection and try again.',
    retry: 'Try again',
  },

  notFound: {
    title: "This calendar doesn't exist",
    body: 'The link might be mistyped, or the calendar was removed.',
    cta: 'Create a new one',
  },
} as const;
