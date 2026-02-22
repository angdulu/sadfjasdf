
# Project Blueprint

## Overview

This project is a web application that allows users to check the potential health risks associated with common household items. The application provides a user-friendly interface to browse and search for items, and it displays clear and concise information about the risks involved.

## Design and Features

### Visual Design
*   **Aesthetics:** The application has a clean, modern, and intuitive design that makes it easy for users to find the information they need.
*   **Color Palette:** A color-coded system is used to represent risk levels: green for low, yellow for medium, and red for high. This provides an immediate visual cue about the potential danger of a product.
*   **Typography:** The site uses clear, legible fonts (primarily from the system's UI font stack) to ensure readability across all devices.
*   **Layout:** The layout is a responsive grid that adapts to different screen sizes, ensuring a good experience on both mobile and desktop.
*   **Iconography:** SVG icons are used to visually represent risk levels, enhancing usability.
*   **Visual Effects:** Cards have a subtle drop shadow and a 3D flip effect on click to reveal more information. Interactive elements have hover effects.

### Features
*   **Item Database:** A collection of common household items and their associated health risks, stored in `items.json`.
*   **Search and Filter:** A prominent search bar allows users to filter items by name in real-time.
*   **Risk Display:** Each item is displayed on a "card" that shows its name, risk level, a description of the potential hazards, recommendations for safer use, and an illustrative image.
*   **Web Components:** The application uses a custom `<item-card>` element to create encapsulated, reusable UI components for each item.

## Current Plan: "Codex CLI" - Advanced Interactivity

*   **Goal:** Enhance the user experience with advanced interactivity and iconography, making the application more dynamic and visually engaging.
*   **Steps:**
    1.  **Update `blueprint.md`**: Reflect the "Codex CLI" enhancement plan. (Done)
    2.  **Integrate Icons**: Add SVG icons to visually represent risk levels.
    3.  **Update `style.css`**: 
        *   Implement a 3D flip-card effect for the item cards.
        *   Style the front and back of the cards.
        *   Style the new icons.
    4.  **Update `main.js`**: Modify the `ItemCard` web component to support the flip-card structure and include the risk icons.
