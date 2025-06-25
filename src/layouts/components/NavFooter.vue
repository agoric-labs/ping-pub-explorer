<template>
  <footer
    class="bg-gray-100 dark:bg-gray-dark-100 flex flex-shrink-0 h-12 items-center text-sm w-full z-10"
  >
    <div class="flex flex-1">
      &copy;&nbsp;
      {{ new Date().getFullYear() }}&nbsp; Made With&nbsp;
      <img src="/heart.svg" />&nbsp; By&nbsp;
      <a
        class="link link-primary no-underline"
        href="https://ping.pub"
        target="_blank"
        rel="noopener noreferrer"
        >Ping.pub</a
      >
    </div>
    <div class="hidden md:!block">
      <a
        class="link link-primary no-underline mr-4"
        href="https://github.com/agoric-labs/ping-pub-explorer/blob/master/LICENSE"
        target="noopener noreferrer"
        >License</a
      >
      <a
        class="link link-primary no-underline"
        href="https://github.com/agoric-labs/ping-pub-explorer"
        target="noopener noreferrer"
        >Github</a
      >
    </div>
  </footer>
</template>
