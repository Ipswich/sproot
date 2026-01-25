import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Sproot Docs",
  tagline: "Documentation for Sproot!",
  favicon: "img/favicon.png",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "http://localhost",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/docs/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "Ipswich", // Usually your GitHub org/user name.
  projectName: "Sproot", // Usually your repo name.

  onBrokenLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
        },
        blog: false,
        pages: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/favicon.png",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Sproot Docs",
      logo: {
        alt: "Sproot Docs",
        src: "img/favicon.png",
      },
      items: [
        {
          type: "doc",
          docId: "home",
          position: "left",
          label: "Home",
        },
        {
          type: "dropdown",
          label: "Getting Started",
          position: "left",
          items: [
            {
              type: "doc",
              label: "Installation",
              docId: "getting-started/installation",
            },
            {
              type: "doc",
              label: "Setup",
              docId: "getting-started/setup",
            },
            {
              type: "doc",
              label: "Features",
              docId: "getting-started/features",
            },
          ],
        },
        {
          type: "dropdown",
          label: "How To",
          position: "left",
          items: [
            {
              type: "doc",
              label: "Overview",
              docId: "how-to/overview",
            },
            {
              type: "doc",
              label: "Sensors",
              docId: "how-to/sensors",
            },
            {
              type: "doc",
              label: "Outputs",
              docId: "how-to/outputs",
            },
            {
              type: "doc",
              label: "Automations",
              docId: "how-to/automations",
            },
            {
              type: "doc",
              label: "Subcontrollers",
              docId: "how-to/subcontrollers",
            },
            {
              type: "doc",
              label: "Camera",
              docId: "how-to/camera",
            },
            {
              type: "doc",
              label: "Backups",
              docId: "how-to/backups",
            },
            {
              type: "doc",
              label: "System Status",
              docId: "how-to/system-status",
            },
          ],
        },
        {
          href: "https://github.com/Ipswich/sproot",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      // links: [
      //   {
      //     title: 'Docs',
      //     items: [
      //       {
      //         label: 'Tutorial',
      //         to: '/docs/intro',
      //       },
      //     ],
      //   },
      //   {
      //     title: 'More',
      //     items: [
      //       {
      //         label: 'GitHub',
      //         href: 'https://github.com/Ipswich/sproot',
      //       },
      //     ],
      //   },
      // ],
      logo: {
        style: { height: "40px" },
        alt: "Sproot Logo",
        src: "img/favicon.png",
      },
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://www.github.com/Ipswich">Ipswich</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
