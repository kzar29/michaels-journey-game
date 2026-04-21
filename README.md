Michael Journey 🎮

A simple, cute, and chaotic arcade-style endless platform jumper built for the browser.

The game features a pixel-art version of Michael jumping upward across platforms. The goal is to land on as many platforms as possible before falling.

🧠 Overview

Michael Journey is a lightweight 2D browser game built using Phaser.js. It runs entirely on the frontend and is optimized for both mobile and desktop play.

This project was built as a minimal MVP to:

test core gameplay mechanics
support custom sprite assets (Michael character)
be easy to expand later
🎯 Core Gameplay
Endless vertical platform jumper
Player manually jumps and moves left/right
Platforms spawn continuously
Score increases for each platform landed on
Game ends when the player falls below the screen

🎮 Controls
Mobile
Hold left side of screen → move left
Hold right side of screen → move right
Tap jump button → jump
Desktop
A / Left Arrow → move left
D / Right Arrow → move right
Spacebar / Up Arrow → jump

🕹️ Game Flow
Start Screen
Displays title and start button
Gameplay
Player controls Michael
Platforms generate infinitely
Score updates in real-time
Game Over
Triggered when player falls
Final score displayed
Restart option available

🧱 Tech Stack
HTML5
CSS
JavaScript
Phaser.js (game engine)

📁 Project Structure
/assets
  /player        → character sprite(s)
  /platform      → platform visuals
  /audio         → sound effects (jump, etc.)
  /background    → background images
  /ui            → buttons, UI elements

index.html       → entry point, loads the game
main.js / game.js → core game logic

🧩 Architecture Overview
Entry Point
index.html initializes Phaser and loads scripts
Game Engine
Phaser handles rendering, physics, and game loop
Scenes (Game States)
Start Scene → title + start button
Game Scene → core gameplay
Game Over Scene → score + restart
Game Loop

Runs continuously:
updates player position
applies gravity
checks collisions
spawns platforms
updates score

🎨 Assets
Required Assets
assets/player/michael.png
full-body pixel sprite
transparent background
assets/platform/platform.png
platform image or simple shape
assets/audio/jump.wav
jump sound effect
Sprite Notes
PNG format with transparency
Recommended size: 256x256 or 512x512
Centered character for proper scaling
Easy to replace without changing code

⚙️ Key Editable Values
These are typically found in the main game file:
Jump strength
Gravity
Player movement speed
Platform spacing
Spawn rate
Score logic

You can tweak these to change difficulty and feel.


🔄 Future Improvements
Animated sprite (idle / jump / fall)
Moving platforms
Obstacles
Sound effects + music
Score persistence (local storage)
Themed backgrounds
Funny voice clips or inside jokes

🧠 Learning Notes
This project demonstrates:
game loop structure
state management (scenes)
physics-based movement
asset loading and usage
modular file structure

These concepts apply to:
games
frontend apps
interactive web experiences

💡 Purpose
Built as a personal, creative project to explore:
rapid prototyping with AI
browser-based game development
custom sprite integration
