Create a fast, minimal onboarding flow for a mobile app called Reclip.

The onboarding should prioritize immediate interaction over explanation, since Gen Z and Gen Alpha rarely read onboarding text.

The goal is to get users to record their first clip within 10 seconds.

Use a clean dark modern UI, large touch targets, minimal words, and playful micro‑interactions.

Design a clickable prototype with animated states.

Design Style
• Dark background (#0E0E10)
• Accent color: neon purple or electric blue
• Large rounded buttons (24px radius)
• Minimal text (1 short sentence max per screen)
• Large icons and motion‑driven UI
• Smooth transitions (250–300ms)
• Subtle glow effects for primary actions

The interface should feel like a mix of TikTok, BeReal, and Snapchat camera UI.

Screen 1 — Instant Start
This screen combines Try + Mic Permission.

Center of screen:

Large radial audio visualizer slowly pulsing.

Headline:

Say something.

Subtext (small):

Tap Clip.

Primary Button (large circular button in center):

CLIP

Small microcopy below:

Enable mic to start

Interaction
When the user taps Clip:

Simulate iOS microphone permission popup.

"Allow Reclip to access your microphone?"

Buttons:

Allow / Don't Allow

If user taps Allow:

The radial visualizer instantly reacts to audio.

Screen 2 — First Clip (Instant Reward)
The moment mic is enabled:

The interface should feel alive immediately.

Radial visualizer becomes reactive.

Prompt text appears briefly:

Nice. Now tap Clip.

User taps Clip again.

Animation:

• Button compress
• Radial visualizer burst
• Short haptic feedback

Toast appears:

Saved the last 2 minutes

Transition immediately to playback.

Screen 3 — Magic Moment
Show a clip playback card.

Waveform visualization.

Playback controls:

Play / Pause.

Headline:

You caught it.

Buttons below:

• Animate
• Add Photo
• Share

Primary button:

Share

Keep the UI playful and visual.

Screen 4 — Viral Trigger
Headline:

Send this to someone

Large icon buttons:

• Messages
• Copy Link
• Share

Small subtext:

They can catch their own moments too.

Primary CTA:

Send

Screen 5 — Friend Loop Screen
Show avatars of example friends.

Headline:

Moments with friends

Small animation of clips appearing on a timeline.

CTA:

Invite Friends

Secondary:

Skip

Interaction Requirements
Include the following behaviors:

• Audio visualizer reacting to voice
• Clip button press animation
• Toast confirmation ("Saved")
• Smooth transitions between screens
• Animated waveform playback
• Share sheet interaction

UX Principles
Design the flow so the user:

Opens the app

Taps Clip

Grants mic permission

Saves a clip

Plays it back

Shares it

All within 10–15 seconds.

Goal
This onboarding should:

• Teach the product through interaction
• Create an immediate dopamine moment
• Encourage sharing
• Start the viral loop

The user should understand the product without needing to read instructions.

If you'd like, I can also show you the onboarding mechanic that made BeReal explode with Gen Z — and how Reclip could adapt it in a much more powerful way.








create a prompt for the second users who get invited to create their moment.

ChatGPT11:41 PM
Here’s a Figma Make prompt designed specifically for the invited user experience (the second user entering the viral loop). The goal is to convert curiosity into their first clip in under 10 seconds, with almost no reading.

Figma Make Prompt — Invited User “Create Your Moment” Flow
Design a minimal, high‑energy onboarding flow for a mobile app called Reclip for users who arrive through a shared clip link from a friend.

The experience should prioritize curiosity → instant action → first clip creation, with very little text, since Gen Z and Gen Alpha rarely read onboarding instructions.

The user should understand the product through interaction, motion, and audio feedback, not explanations.

Create a clickable prototype with animations and transitions.

Design Style
Use a modern social camera aesthetic similar to TikTok / Snapchat.

Design system:

• Dark theme background (#0E0E10)
• Accent color: neon purple or electric cyan
• Large rounded buttons (24px radius)
• Large icons, minimal text
• Strong motion + playful feedback
• 8pt spacing system
• Rounded cards and glowing accents
• Large tap targets for thumb interaction

Typography should be bold, modern, and easy to scan.

Screen 1 — Incoming Clip
Purpose: Create curiosity and social proof.

Layout:

Top:
Friend avatar + username

Text:

“Kelby sent you a moment”

Center:
Audio clip player card

Show:

• waveform preview
• play button
• timestamp

The clip autoplays when the screen opens.

Bottom CTA:

Large button:

Catch your own moment

Small microcopy:

Tap Clip to save the last 2 minutes

Screen 2 — Instant Action
Purpose: Trigger their first interaction immediately.

Center of screen:

Large radial audio visualizer slowly reacting to microphone input.

Short headline:

Say something.

Primary control:

Large circular CLIP button.

Below button:

Small microcopy:

Enable mic to start

Interaction
When the user taps Clip:

Show simulated iOS microphone permission popup.

“Allow Reclip to access your microphone?”

Buttons:

Allow / Don't Allow

If Allow is tapped:

The radial visualizer becomes fully reactive to voice input.

Prompt appears briefly:

Now tap Clip

Screen 3 — First Clip Captured
User taps Clip again.

Animation:

• button compress
• radial visualizer pulse
• waveform flash

Toast message appears:

Saved the last 2 minutes

Transition to playback screen.

Screen 4 — Magic Moment
Display their newly captured clip.

Waveform playback UI.

Title:

You caught the moment

Playback controls:

• play / pause
• scrub timeline

Actions below:

• Animate
• Add Photo
• Share

Primary CTA:

Send to a friend

Screen 5 — Viral Loop Trigger
Purpose: Continue the viral cycle.

Headline:

Who should hear this?

Large icon buttons:

• Messages
• Copy Link
• Share

Small subtext:

They can catch their own moments too

Primary CTA:

Send

Interaction Requirements
Prototype should include:

• Autoplay clip on first screen
• Radial audio visualizer reacting to voice
• Clip button animation
• Waveform playback UI
• Smooth screen transitions
• Toast confirmation messages
• Share sheet interaction

User Journey
This flow should simulate the following experience:

Friend sends a clip

User listens to it

Curiosity is triggered

User taps Catch your own moment

Mic permission granted

User records first clip

User shares with another friend

The entire flow should take 10–15 seconds.

Goal
Turn invited users into creators immediately, while continuing the viral sharing loop that spreads Reclip organically through friend networks.