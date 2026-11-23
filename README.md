# Smart Desk / On-Air

This package has two separate demo modes using the same phone interface:

1. **Laptop simulator:** runs without hardware. Any browsers connected to that laptop share status, messages and timer state. It does NOT control the physical board.
2. **ESP32 standalone:** the board creates its own Wi-Fi network and serves the interface. The phone controls the actual RGB LED. No laptop server, internet, external display, or router is required after flashing.

State is in memory and resets when the server or board restarts. The screen on the webpage is a preview; there is no physical text display yet. Selecting a status does not automatically stop a running timer. Timer completion sets status to Free. The board has no external demo buttons yet; BOOT/RST retain their programming/reset roles.

Use **+ Add status** beside the three default desk settings to create and select your own status, such as “Out for lunch.” You can add up to 12 custom statuses with unique names of 1–32 characters. Use the **×** beside a custom status to delete it; deleting the selected status switches the desk to Free. The three defaults cannot be deleted. Custom statuses sync across browsers connected to the same simulator or board and reset when it restarts. Custom statuses use a purple preview accent and a purple RGB LED in board mode.

## Get the project

Download this repository on a **laptop**, using GitHub's **Code > Download ZIP**, then extract it. Alternatively:

```sh
git clone https://github.com/SVargas42/Micro-Controller-Project.git
cd Micro-Controller-Project
```

The phone only needs a browser; do not download or install the source code on it. Follow either setup below. No GCP server or other cloud hosting is required. To get later changes in a cloned copy, run `git pull` after saving your local work.

## A. Laptop simulator — no board required

1. Install **Node.js LTS, version 20 or newer**, from https://nodejs.org . No npm packages are needed.
2. On Windows, double-click `START-DEMO.cmd`. On macOS/Linux, open a terminal in the extracted folder and run `node server.mjs`.
3. On that computer open **http://localhost:8080**.
4. For a phone demonstration, connect the phone and computer to the same private Wi-Fi. Open the **Phone on same Wi-Fi** address printed by the server, such as `http://192.168.1.20:8080`. Do not type localhost on the phone.
5. If Windows asks about firewall access, allow Node on your private network. Guest/campus networks may isolate devices; use the ESP32 standalone mode below instead. Do not forward router ports.
6. Open the page on both the laptop and phone. Change statuses on the phone and watch the laptop preview update. Use Ctrl+C in the server window to stop it.

This version intentionally displays “Browser simulator — no hardware connected.” Nothing is installed on the phone. Use its browser; no Play Store app or Bluetooth pairing is needed. The layout is designed for small Android screens, but has not been tested on the physical BLU G50 Plus.

## B. ESP32 standalone demo — physical RGB LED

### Install tools on the teammate's computer

1. Install **Arduino IDE 2**: https://www.arduino.cc/en/software/
2. In Arduino IDE Preferences, add this Additional Boards Manager URL:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
3. In Boards Manager install **esp32 by Espressif Systems**, a stable **3.x** release.
4. In Library Manager install **ArduinoJson by Benoit Blanchon (7.x)** and **Adafruit NeoPixel by Adafruit**. Accept any library dependencies.
5. Open `firmware/SmartDeskDemo/SmartDeskDemo.ino`. Keep `web_page.h` in the same folder; it is already generated and included.

### Board settings and upload

The photo shows a generic ESP32-S3 board and an apparent N16R8 module, but does not establish its exact manufacturer or RGB wiring.

- Board: **ESP32S3 Dev Module**.
- Flash size: **16MB**, based on the apparent N16R8 marking; verify the printed marking if uploads report a mismatch.
- Leave PSRAM **Disabled** for this demo; it is not required.
- Use default partition settings; the demo is small.
- Serial Monitor speed: **115200**.
- Connect one USB data cable to the port marked **COM** on the board's underside. Select the port that appears in Arduino IDE. This is the USB-to-serial path; leave USB CDC On Boot disabled when using it.
- If COM is not detected, confirm the cable supports data, try another USB port, and check Device Manager. Identify the USB bridge before installing a matching driver from its manufacturer. Do not install random driver bundles.
- If uploading fails: hold BOOT, tap RST, release BOOT, then upload again. Tap RST after upload if needed.

### Verify the onboard RGB LED first

1. In the sketch set `LED_TEST_ONLY` to `true`. Leave `RGB_PIN` at **48** for the first test.
2. Upload. The RGB LED should cycle red, green, and blue about once per second.
3. If it stays dark, try **38** for `RGB_PIN` and upload again. These are candidate pins for common S3 layouts, not a confirmed pinout for this board. If neither works, inspect the board/vendor schematic rather than trying arbitrary pins. Firmware can still demonstrate phone controls and Serial output, but do not claim the LED is verified.
4. If the colors are swapped, adjust `NEO_GRB` to the pixel's documented order.
5. Once working, keep the verified pin and set `LED_TEST_ONLY` back to **false**. Upload again.

### Connect the BLU phone

1. Power the ESP32 from its USB connection. The RGB should be green.
2. In the phone's Wi-Fi settings join **SmartDesk-Demo**, password **DeskDemo2026**.
3. Android may warn that this network has no internet. Choose to **stay connected/use this network anyway**. Temporarily turn off mobile data or automatic switching to mobile data if the browser leaves this Wi-Fi network.
4. In the browser's address bar type **http://192.168.4.1** including `http://`. The Serial Monitor also prints the board address.
5. Tap Free: green. In a meeting: red. Deep focus: blue. Start the ten-second timer: blue during focus, green at completion.
6. Open the same address from a second device on SmartDesk-Demo to show synchronized control and preview. The LED and timer continue without the phone page open.

This is a local classroom demo. Anyone with the demo Wi-Fi password can control it. Change the password in the sketch if needed. There is no internet access through the board, automatic meeting detection, scheduled dimming, authentication screen, or cloud sync in this version.

## Development and validation

- `npm test`: HTTP integration checks for status sync, message transport, timer pause/resume/completion, invalid duration, and static-path protection.
- `node --check server.mjs` and `node --check web/app.js`: JavaScript syntax checks.
- `node prepare-firmware.mjs`: regenerate the embedded page after editing files in `web/`. Arduino compilation does not do this automatically.
- `npm start`: simulator on port 8080. Set `PORT` in the shell to override it.
- `firmware/SmartDeskDemo/web_page.h`: generated self-contained interface with no internet font/CDN dependencies.

The simulator and board expose GET `/api/state` and POST `/api/action` with URL-encoded form bodies. Actions: status(value=free/meeting/focus or a custom status ID), add-status(value=name), delete-status(value=custom status ID), message(value=text), start(seconds=1..7200), pause, resume, reset. State includes a `customStatuses` array of `{id,label}` objects. Adding a status selects it immediately. The page polls every 500 ms. The board owns its timer using millis(); the simulator uses its own clock. These modes do not synchronize with each other.

The physical display and future external buttons can reuse this state. Keep the antenna end clear of metal and wiring in the future printed case. Hardware wiring, LED pin, firmware compilation/upload, and BLU phone operation still require verification on the teammate's equipment.

References: Espressif Wi-Fi AP API https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html ; ArduinoJson https://arduinojson.org/v7/ ; NeoPixel library https://github.com/adafruit/Adafruit_NeoPixel .
