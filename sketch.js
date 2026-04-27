const url = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";
const ELEVEN_LABS_API_KEY = "sk_c86c4366bee1dcd37a93e19409a8807aa8017766c95918e1";
const VOICE_ID = "PIGsltMj3gFMR34aFDI3"; 

let systemPrompt;
let conversationHistory = [];
let scene = 1; 
let images = [];         
let chatImages = [];     
let chatImgIdx = 0;      
let drinkImage = null; 
let finalImage; // 8.JPG

let bgm1, bgm2, bgm3;
let currentBgm = null;

let myInput, myButton, confirmBtn;
let chatLog = ""; 
let savedDone = false; // 标记是否已保存

let extractedData = { name: "", drink: "", color: "", shakes: "", ingredient: "" };
let signatureLines = [];
let isSigning = false;
let sigBox = { x: 0, y: 0, w: 320, h: 80 }; 
let pastRecipes = []; 

function preload() {
  for (let i = 1; i <= 3; i++) images[i] = loadImage(`${i}.JPG`);
  for (let i = 4; i <= 7; i++) {
    chatImages.push(loadImage(`${i}.JPG`));
  }
  finalImage = loadImage('8.JPG'); // 加载结局图

  systemPrompt = loadStrings("prompt.txt");
  let saved = localStorage.getItem('sliver_memories');
  if (saved) {
    let rawData = JSON.parse(saved);
    pastRecipes = rawData.filter(item => item.ingredient && !item.ingredient.includes("shadow"));
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  conversationHistory = [systemPrompt.join(" ")];

  bgm1 = createAudio('MA1.mp3');
  bgm2 = createAudio('MA2.mp3');
  bgm3 = createAudio('MA3.mp3');

  myInput = createInput("");
  myInput.attribute('placeholder', 'Whisper your truth...');
  styleInput();
  myInput.hide();

  myButton = createButton("SEND");
  styleButton();
  myButton.mousePressed(chat);
  myButton.hide();

  confirmBtn = createButton('SEAL THE MEMORY');
  confirmBtn.style('background', '#111');
  confirmBtn.style('color', '#ffd700');
  confirmBtn.style('border', '1px solid #ffd700');
  confirmBtn.style('font-family', 'Verdana');
  confirmBtn.style('font-size', '12px');
  confirmBtn.style('cursor', 'pointer');
  confirmBtn.mousePressed(saveRecipeAndMemory);
  confirmBtn.hide();

  sigBox.x = width / 2 - 160;
  sigBox.y = height - 120;
}

function manageAudio(newBgm) {
  if (currentBgm === newBgm) return;
  if (currentBgm) { currentBgm.pause(); currentBgm.time(0); }
  currentBgm = newBgm;
  if (currentBgm) { currentBgm.volume(0.15); currentBgm.loop(); }
}

function draw() {
  background(0);
  if (scene < 4) {
    if (images[scene]) drawBackgroundImage(images[scene]);
  } else if (scene === 4) {
    if (chatImages[chatImgIdx]) drawBackgroundImage(chatImages[chatImgIdx]);
    drawChatUI();
  } else if (scene === 5) {
    drawRecipePage();
  } else if (scene === 6) {
    drawFinalScene();
  }
}

function drawFinalScene() {
  drawBackgroundImage(finalImage);
  fill(0, 150); // 给文字加个淡淡的暗角背景
  rectMode(CENTER);
  rect(width/2, height/2, width * 0.8, 100);
  
  fill(255, 200);
  textAlign(CENTER, CENTER);
  textFont('Georgia');
  textSize(22);
  textStyle(ITALIC);
  text("The glass is empty, but the echo of your soul remains.\nWalk carefully, traveler. The night is long.", width/2, height/2);
}

function drawRecipePage() {
  fill(0, 245);
  rectMode(CORNER);
  rect(0, 0, width, height);

  if (drinkImage) {
    imageMode(CENTER);
    image(drinkImage, width / 2, height / 2 - 180, 260, 260);
  }

  push();
  textAlign(LEFT, TOP);
  textFont('Courier New');
  noStroke();
  let listX = 40, listY = 50, listWidth = 240, lineHeight = 16;
  fill(255, 215, 0, 150);
  textSize(12);
  text("PAST ESSENCES LOG", listX, listY);
  listY += 30;
  textSize(10);
  for(let i = 0; i < pastRecipes.length && i < 6; i++) {
    let guestName = (pastRecipes[i].user || "STRANGER").toUpperCase();
    let essence = pastRecipes[i].ingredient || "secret spirit";
    fill(255, 215, 0, 180);
    text(`> ${guestName}:`, listX, listY);
    fill(200, 180);
    let indentX = 15;
    let contentY = listY + lineHeight;
    textLeading(lineHeight); 
    text(essence, listX + indentX, contentY, listWidth - indentX, 200);
    let tw = textWidth(essence);
    let rows = ceil(tw / (listWidth - indentX));
    listY += (rows * lineHeight) + 25;
  }
  pop();

  textAlign(CENTER, TOP);
  let drawCT = (content, x, y, size, col, isBold) => {
    push();
    if (isBold) textStyle(BOLD); else textStyle(NORMAL);
    textSize(size);
    drawingContext.shadowBlur = 12;
    drawingContext.shadowColor = 'rgba(0, 0, 0, 1)';
    fill(col);
    text(content, x, y);
    pop();
  };

  textFont('Verdana'); 
  drawCT(extractedData.drink.toUpperCase(), width/2, height/2 - 30, 22, color(255, 215, 0), true);
  textFont('Courier New');
  drawCT(`BREWED FOR: ${extractedData.name.toUpperCase()}`, width/2, height/2 + 15, 15, color(240), false);
  drawCT(`INFUSED WITH: ${extractedData.ingredient}`, width/2, height/2 + 40, 15, color(240), false);
  textFont('Verdana');
  drawCT(`THE LIQUID TURNS ${extractedData.color.toUpperCase()}`, width/2, height/2 + 70, 13, color(100, 255, 218), true);
  drawCT(`AFTER SHAKING EXACTLY ${extractedData.shakes} TIMES`, width/2, height/2 + 90, 13, color(100, 255, 218), true);

  if (!savedDone) {
    noStroke(); fill(130); textSize(10); textStyle(ITALIC);
    text("SIGN TO BIND YOUR SOUL", width/2, sigBox.y + 10);
    drawSignatureLines();
  } else {
    fill(255, 215, 0, 200); textSize(12);
    text("MEMORIZED. CLICK ANYWHERE TO LEAVE.", width/2, sigBox.y + 30);
  }
}

function chat() {
  let val = myInput.value();
  if (val === "") return;
  chatImgIdx = (chatImgIdx + 1) % chatImages.length;
  chatLog = "..."; 
  conversationHistory.push("You: " + val);
  myInput.value("");
  
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "anthropic/claude-4.5-sonnet",
      input: { prompt: conversationHistory.join("\n") + "\nBot:", max_tokens: 1024, temperature: 0.8 }
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.output) {
      let reply = data.output.join("");
      chatLog = reply;
      conversationHistory.push("Bot: " + reply);
      speak(reply);
      if (reply.toLowerCase().includes("shake")) {
        extractInfo(reply);
        generateDrinkVisual(extractedData.drink, extractedData.color);
        setTimeout(enterRecipeScene, 9000); 
      }
    }
  });
}

function extractInfo(text) {
  let detectedName = "";
  for (let i = 0; i < conversationHistory.length; i++) {
    let line = conversationHistory[i];
    if (line.startsWith("You: ")) {
      let content = line.replace("You: ", "").trim();
      let nameMatch = content.match(/(?:my name is|i am|i'm)\s+([a-zA-Z\u4e00-\u9fa5]+)/i);
      if (nameMatch) { detectedName = nameMatch[1]; break; }
      let words = content.split(/\s+/);
      if (words.length <= 3) {
        let candidate = words[0].replace(/[^\w]/g, "");
        let blacklist = ["hi", "hello", "hey", "i", "im", "my"];
        if (!blacklist.includes(candidate.toLowerCase())) { detectedName = candidate; break; }
      }
    }
    if (detectedName) break;
  }
  extractedData.name = detectedName || "Traveler";
  let drinkM = text.match(/glass of (.*?), enriched/i);
  extractedData.drink = drinkM ? drinkM[1] : "The Unnamed Fragment";
  let ingM = text.match(/enriched with (.*?). Turn/i);
  extractedData.ingredient = ingM ? ingM[1] : "unspoken essence";
  let colorM = text.match(/glows (.*?). Then/i);
  extractedData.color = colorM ? colorM[1] : "amber";
  let shakeM = text.match(/exactly (\d+) times/i);
  extractedData.shakes = shakeM ? shakeM[1] : "7";
}

function saveRecipeAndMemory() {
  confirmBtn.hide(); 
  draw(); 
  saveCanvas(`Recipe_${extractedData.name}`, 'jpg');
  
  let newMemory = { user: extractedData.name, ingredient: extractedData.ingredient };
  pastRecipes.unshift(newMemory);
  localStorage.setItem('sliver_memories', JSON.stringify(pastRecipes.slice(0, 8))); 
  
  savedDone = true; // 开启进入结局的开关
}

async function generateDrinkVisual(drinkName, drinkColor) {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "black-forest-labs/flux-schnell",
      input: { prompt: `A cinematic close-up of a mystical cocktail glowing in vivid ${drinkColor}, infused with ${extractedData.ingredient}, in a dark noir bar, 8k resolution.` }
    })
  }).then(res => res.json()).then(data => {
    if (data.output) loadImage(data.output[0], img => { drinkImage = img; });
  });
}

function mousePressed() {
  if (getAudioContext().state !== 'running') userStartAudio();
  
  if (scene < 4) {
    scene++;
    if (scene === 2) manageAudio(bgm1);
    else if (scene === 4) { manageAudio(bgm2); myInput.show(); myButton.show(); startSliver(); }
  } else if (scene === 5) {
    // 如果已经保存成功，再次点击进入最终场景
    if (savedDone) {
      scene = 6;
      manageAudio(null); // 结局静音或保持 bgm3
      speak("The glass is empty, but the echo of your soul remains. Walk carefully, traveler. The night is long.");
      return;
    }
    
    if (mouseX > sigBox.x && mouseX < sigBox.x + sigBox.w && mouseY > sigBox.y && mouseY < sigBox.y + sigBox.h) {
      isSigning = true; signatureLines.push([]);
    }
  }
}

function startSliver() {
  chatLog = "I’m Sliver. Here, we distill the unspoken into spirits. Tell me, traveler, what name shall I label your bottle with tonight?";
  conversationHistory.push("Bot: " + chatLog);
  speak(chatLog);
}

function enterRecipeScene() {
  scene = 5; 
  manageAudio(bgm3);
  myInput.hide(); myButton.hide();
  confirmBtn.position(width / 2 - 65, height - 35); 
  confirmBtn.show();
}

function drawSignatureLines() {
  stroke(255); strokeWeight(2); noFill();
  for (let line of signatureLines) {
    beginShape();
    for (let pt of line) vertex(pt.x, pt.y);
    endShape();
  }
}

function mouseDragged() {
  if (scene === 5 && isSigning) signatureLines[signatureLines.length - 1].push({ x: mouseX, y: mouseY });
}

function mouseReleased() { isSigning = false; }

function drawBackgroundImage(img) {
  let ratio = Math.max(width / img.width, height / img.height);
  imageMode(CENTER);
  image(img, width / 2, height / 2, img.width * ratio, img.height * ratio);
}

function drawChatUI() {
  fill(0, 190); noStroke(); rectMode(CORNER);
  rect(0, height - 330, width, 240);
  fill(240); textAlign(LEFT, TOP); textSize(24); textLeading(32); textFont('Georgia');
  text(chatLog, 50, height - 310, width - 100, 200);
}

async function speak(text) {
  let cleanText = text.replace(/\*.*?\*/g, "").trim();
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": ELEVEN_LABS_API_KEY },
      body: JSON.stringify({ text: cleanText, model_id: "eleven_turbo_v2" })
    });
    const blob = await res.blob();
    new Audio(URL.createObjectURL(blob)).play();
  } catch (e) { console.error(e); }
}

function styleInput() {
  myInput.position(50, height - 70);
  myInput.size(width - 180, 45);
  myInput.style('background', 'rgba(255,255,255,0.1)');
  myInput.style('color', '#fff');
  myInput.style('border', '1px solid #444');
}

function styleButton() {
  myButton.position(width - 110, height - 70);
  myButton.size(80, 49);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); styleInput(); styleButton(); }
function keyPressed() { if (keyCode === ENTER && scene === 4) chat(); }