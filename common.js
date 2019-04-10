// HTTP -> HTTPS
if (location.hostname !== 'localhost' && location.protocol !== "https:") location.protocol = "https:";

// SENTRY
let dsn = 'https://8684d9c305bb42d382df3e9a5b4fb648@sentry.io/273014';
let integrations = () => [new Sentry.Integrations.Breadcrumbs()];
let script = document.createElement('script');
script.src = 'https://browser.sentry-cdn.com/5.0.7/bundle.min.js';
script.onload = () => Sentry.init({dsn, integrations: integrations()});
document.head.appendChild(script);
