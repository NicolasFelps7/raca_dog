/* ==========================================================
   DOG LAB — consulta de raças com Dog API

   IMPORTANTE PARA A ATIVIDADE:
   - A consulta à API usa fetch() nativo do JavaScript.
   - Não há biblioteca para realizar a requisição HTTP.
   - Three.js é usado somente como detalhe visual do cachorro e dos ossos.
   ========================================================== */

const DOG_API_BASE = "https://dog.ceo/api";

/* ------------------------------
   ELEMENTOS DO DOM
-------------------------------- */
const breedForm = document.querySelector("#breedForm");
const breedInput = document.querySelector("#breedInput");
const breedSuggestions = document.querySelector("#breedSuggestions");
const searchButton = document.querySelector("#searchButton");
const newImageButton = document.querySelector("#newImageButton");
const systemMessage = document.querySelector("#systemMessage");
const endpointPreview = document.querySelector("#endpointPreview");
const resultPlaceholder = document.querySelector("#resultPlaceholder");
const resultCard = document.querySelector("#resultCard");
const errorCard = document.querySelector("#errorCard");
const errorTitle = document.querySelector("#errorTitle");
const errorText = document.querySelector("#errorText");
const dogImage = document.querySelector("#dogImage");
const breedName = document.querySelector("#breedName");
const requestStatus = document.querySelector("#requestStatus");
const breedSlug = document.querySelector("#breedSlug");
const requestTime = document.querySelector("#requestTime");
const jsonPreview = document.querySelector("#jsonPreview");
const breedCount = document.querySelector("#breedCount");
const apiBadge = document.querySelector("#apiBadge");

let breedMap = {};
let searchableBreeds = [];
let lastResolvedBreed = null;
let activeRequestId = 0;

/* ------------------------------
   UTILIDADES
-------------------------------- */
function normalizeText(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function formatBreedName(value) {
  return value
    .split(/[\s/-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  searchButton.querySelector(".button-label").textContent = isLoading ? "BUSCANDO..." : "BUSCAR";
}

function setSystemMessage(message) {
  systemMessage.textContent = message;
}

function setApiState(isOnline) {
  apiBadge.classList.toggle("offline", !isOnline);
  apiBadge.lastElementChild.textContent = isOnline ? "API ONLINE" : "API OFFLINE";
}

function showOnly(target) {
  resultPlaceholder.hidden = target !== "placeholder";
  resultCard.hidden = target !== "result";
  errorCard.hidden = target !== "error";
}

function showError(title, message) {
  showOnly("error");
  errorTitle.textContent = title;
  errorText.textContent = message;
}

/* ------------------------------
   RF01/RF02 — LISTA OFICIAL DE RAÇAS
   Também serve para o datalist e validação.
-------------------------------- */
async function loadBreeds() {
  try {
    const response = await fetch(`${DOG_API_BASE}/breeds/list/all`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "success" || !data.message || typeof data.message !== "object") {
      throw new Error("Resposta inesperada da API");
    }

    breedMap = data.message;
    searchableBreeds = buildSearchableBreeds(breedMap);
    renderBreedSuggestions(searchableBreeds);

    const uniqueMainBreeds = Object.keys(breedMap).length;
    breedCount.textContent = uniqueMainBreeds;
    setApiState(true);
  } catch (error) {
    console.error("Erro ao carregar a lista de raças:", error);
    breedCount.textContent = "100+";
    setApiState(false);
    setSystemMessage("A lista de sugestões não carregou, mas você ainda pode tentar uma consulta.");
  }
}

function buildSearchableBreeds(map) {
  const items = [];

  Object.entries(map).forEach(([breed, subBreeds]) => {
    items.push({
      label: formatBreedName(breed),
      normalized: normalizeText(breed),
      endpointPath: breed,
      displayName: formatBreedName(breed),
    });

    subBreeds.forEach((subBreed) => {
      const displayName = `${formatBreedName(subBreed)} ${formatBreedName(breed)}`;

      items.push({
        label: displayName,
        normalized: normalizeText(`${subBreed} ${breed}`),
        endpointPath: `${breed}/${subBreed}`,
        displayName,
      });

      // Também aceita o jeito que a Dog API costuma nomear, ex.: hound afghan.
      items.push({
        label: `${formatBreedName(breed)} ${formatBreedName(subBreed)}`,
        normalized: normalizeText(`${breed} ${subBreed}`),
        endpointPath: `${breed}/${subBreed}`,
        displayName,
        alias: true,
      });
    });
  });

  return items;
}

function renderBreedSuggestions(items) {
  breedSuggestions.innerHTML = "";
  const uniqueLabels = [...new Set(items.map((item) => item.label.toLowerCase()))].sort();

  uniqueLabels.forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    breedSuggestions.appendChild(option);
  });
}

function resolveBreed(userValue) {
  const normalized = normalizeText(userValue);
  if (!normalized) return null;

  if (searchableBreeds.length > 0) {
    return searchableBreeds.find((item) => item.normalized === normalized) || null;
  }

  // Fallback apenas se a lista inicial não pôde ser carregada.
  // Para raças simples (husky, pug, poodle...) o endpoint ainda funciona.
  const simpleBreed = normalized.split(" ")[0];
  return {
    endpointPath: simpleBreed,
    displayName: formatBreedName(simpleBreed),
    normalized: simpleBreed,
  };
}

/* ------------------------------
   RF02/RF03/RF04/RF05/RF06
   CONSULTA PRINCIPAL COM fetch + async/await
-------------------------------- */
async function searchBreed(userValue) {
  const cleanValue = userValue.trim();

  if (!cleanValue) {
    showError("CAMPO VAZIO", "Digite o nome de uma raça em inglês para realizar a consulta.");
    setSystemMessage("Consulta cancelada: nenhuma raça foi informada.");
    breedInput.focus();
    return;
  }

  const resolvedBreed = resolveBreed(cleanValue);

  if (!resolvedBreed) {
    showError(
      "RAÇA NÃO ENCONTRADA",
      `“${cleanValue}” não aparece na lista oficial da Dog API. Tente husky, pug, poodle ou akita.`
    );
    setSystemMessage("Resposta inválida tratada antes da consulta.");
    return;
  }

  lastResolvedBreed = resolvedBreed;
  const endpoint = `${DOG_API_BASE}/breed/${resolvedBreed.endpointPath}/images/random`;
  const requestId = ++activeRequestId;

  endpointPreview.textContent = endpoint.replace(DOG_API_BASE, "");
  setLoading(true);
  setSystemMessage(`Enviando GET para ${endpoint.replace(DOG_API_BASE, "")} ...`);

  try {
    const response = await fetch(endpoint);

    // fetch() não rejeita automaticamente em 404/500.
    // Por isso response.ok precisa ser verificado manualmente.
    if (!response.ok) {
      if (response.status === 404) {
        showError("RAÇA NÃO ENCONTRADA", "A API respondeu, mas não encontrou dados para essa raça.");
        setSystemMessage(`A API respondeu HTTP ${response.status}.`);
        return;
      }

      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Evita que uma resposta antiga substitua uma busca mais recente.
    if (requestId !== activeRequestId) return;

    if (data.status !== "success" || typeof data.message !== "string" || !data.message.startsWith("http")) {
      showError("RESPOSTA INVÁLIDA", "A API respondeu, mas os dados recebidos não têm o formato esperado.");
      setSystemMessage("JSON recebido, porém a validação dos dados falhou.");
      return;
    }

    await renderResult(data, resolvedBreed);
    setApiState(true);
  } catch (error) {
    if (requestId !== activeRequestId) return;

    console.error("Erro de comunicação com a Dog API:", error);
    showError(
      "FALHA DE COMUNICAÇÃO",
      "Não foi possível realizar a consulta. Verifique sua internet e tente novamente."
    );
    setSystemMessage("Falha de comunicação tratada pelo try/catch.");
    setApiState(false);
  } finally {
    if (requestId === activeRequestId) {
      setLoading(false);
    }
  }
}

async function renderResult(data, resolvedBreed) {
  try {
    await preloadImage(data.message);
  } catch {
    showError("IMAGEM INDISPONÍVEL", "A API respondeu, mas a imagem retornada não pôde ser carregada.");
    setSystemMessage("URL recebida, porém o arquivo de imagem falhou ao carregar.");
    return;
  }

  dogImage.src = data.message;
  dogImage.alt = `Cachorro da raça ${resolvedBreed.displayName}`;
  breedName.textContent = resolvedBreed.displayName;
  requestStatus.textContent = data.status.toUpperCase();
  breedSlug.textContent = resolvedBreed.endpointPath;
  requestTime.textContent = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  jsonPreview.textContent = JSON.stringify(
    {
      message: data.message,
      status: data.status,
    },
    null,
    2
  );

  showOnly("result");
  setSystemMessage(`Sucesso: dados de ${resolvedBreed.displayName} foram inseridos no DOM.`);

  requestAnimationFrame(() => {
    resultCard.animate(
      [
        { opacity: 0, transform: "translateY(20px) scale(.985)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  });
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
}

/* ------------------------------
   EVENTOS DA INTERFACE
-------------------------------- */
breedForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchBreed(breedInput.value);
});

newImageButton.addEventListener("click", () => {
  if (lastResolvedBreed) {
    searchBreed(lastResolvedBreed.displayName);
  }
});

document.querySelectorAll("[data-breed]").forEach((button) => {
  button.addEventListener("click", () => {
    breedInput.value = button.dataset.breed;
    searchBreed(button.dataset.breed);
  });
});

breedInput.addEventListener("input", () => {
  const raw = normalizeText(breedInput.value);
  const match = searchableBreeds.find((item) => item.normalized === raw);
  const previewPath = match?.endpointPath || raw.replace(/\s+/g, "/");

  endpointPreview.textContent = raw
    ? `/api/breed/${previewPath}/images/random`
    : "/api/breed/{raça}/images/random";
});

/* ------------------------------
   REVEAL, CURSOR E CARDS
-------------------------------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (canHover) {
  const cursorLight = document.querySelector("#cursorLight");

  document.addEventListener("pointermove", (event) => {
    cursorLight.style.left = `${event.clientX}px`;
    cursorLight.style.top = `${event.clientY}px`;
    cursorLight.style.opacity = "1";
  });

  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${y * -7}deg) rotateY(${x * 9}deg) translateZ(7px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

}

/* ==========================================================
   CACHORRO REALISTA + OSSOS INTERATIVOS
   Tudo abaixo é visual. Não interfere no fetch da atividade.
   ========================================================== */
async function initDogVisual() {
  const canvas = document.querySelector("#dogCanvas");
  const frame = document.querySelector("#modelFrame");
  const loader = document.querySelector("#modelLoader");

  if (!window.THREE) {
    loader.innerHTML = "<span>O RECURSO VISUAL NÃO CARREGOU</span>";
    return;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xd49a56, 0.032);

  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  // Câmera mais afastada para garantir que o cachorro inteiro fique enquadrado.
  camera.position.set(0, 0.55, 8.8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const hemi = new THREE.HemisphereLight(0xfff7e8, 0x76513a, 1.15);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe4b0, 2.35);
  key.position.set(4.8, 7.4, 5.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xd78448, 1.5);
  rim.position.set(-5, 2.5, -3.5);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffffff, 0.9, 10);
  fill.position.set(0, 2.6, 5.2);
  scene.add(fill);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xa85f35,
    roughness: 0.78,
    metalness: 0.02,
  });

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.45, 0.25, 96), floorMaterial);
  floor.position.set(0, -2.1, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const floorTop = new THREE.Mesh(
    new THREE.CircleGeometry(3.08, 96),
    new THREE.MeshStandardMaterial({ color: 0xe6ba78, roughness: 0.88 })
  );
  floorTop.rotation.x = -Math.PI / 2;
  floorTop.position.y = -1.965;
  floorTop.receiveShadow = true;
  scene.add(floorTop);

  const backRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.75, 0.055, 16, 150),
    new THREE.MeshStandardMaterial({
      color: 0x5e3726,
      roughness: 0.45,
      metalness: 0.18,
      emissive: 0x4b2d20,
      emissiveIntensity: 0.08,
    })
  );
  backRing.position.set(0, 0.2, -1.2);
  backRing.rotation.x = 0.1;
  scene.add(backRing);

  // Modelo principal: um cachorro GLB real, carregado com GLTFLoader.
  // A Dog API continua sendo a única API usada para a atividade; este modelo é apenas visual.
  const REAL_DOG_MODELS = [
    "https://raw.githubusercontent.com/singhteekam/threejs/main/public/dog/dog.glb",
    "https://raw.githubusercontent.com/a-hakim/senangwebs-verse/main/examples/dog.glb",
  ];

  let dogRoot = null;
  let dogModel = null;
  let dogMixer = null;
  let usingFallbackDog = false;
  let dogBaseY = 0;

  function prepareRealDog(root) {
    root.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material) return;
        material.side = THREE.FrontSide;
        material.needsUpdate = true;
      });
    });

    /*
      O erro anterior vinha do enquadramento: o modelo era escalado só pela altura.
      Se o GLB fosse muito comprido em X/Z, ele podia entrar na câmera e parecer
      uma parede gigante. Agora o tamanho é calculado nos 3 eixos e o cachorro
      é colocado dentro de um grupo de controle separado.
    */
    root.position.set(0, 0, 0);
    root.rotation.set(0, -1.0, 0);
    root.scale.set(1, 1, 1);
    root.updateMatrixWorld(true);

    const rawBox = new THREE.Box3().setFromObject(root);
    const rawSize = rawBox.getSize(new THREE.Vector3());

    if (
      !Number.isFinite(rawSize.x) ||
      !Number.isFinite(rawSize.y) ||
      !Number.isFinite(rawSize.z) ||
      rawSize.lengthSq() < 0.000001
    ) {
      throw new Error("O modelo 3D não possui dimensões válidas");
    }

    // Limites do palco. Usar os três eixos evita o cachorro cortado ou gigante.
    const targetWidth = 1.45;
    const targetHeight = 2.65;
    const targetDepth = 2.65;
    const fitScale = Math.min(
      targetWidth / Math.max(rawSize.x, 0.001),
      targetHeight / Math.max(rawSize.y, 0.001),
      targetDepth / Math.max(rawSize.z, 0.001)
    );

    root.scale.setScalar(fitScale);
    root.updateMatrixWorld(true);

    let box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());

    // Centraliza X/Z e encosta as patas no palco.
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y += -1.90 - box.min.y;
    root.updateMatrixWorld(true);

    // Uma segunda passada corrige modelos cujo pivô muda depois do scale/rotation.
    box = new THREE.Box3().setFromObject(root);
    const finalCenter = box.getCenter(new THREE.Vector3());
    root.position.x -= finalCenter.x;
    root.position.z -= finalCenter.z;
    root.position.y += -1.90 - box.min.y;
    root.updateMatrixWorld(true);

    const wrapper = new THREE.Group();
    wrapper.add(root);
    wrapper.userData.isRealDog = true;
    return { wrapper, model: root };
  }

  function loadModel(url) {
    return new Promise((resolve, reject) => {
      if (!THREE.GLTFLoader) {
        reject(new Error("GLTFLoader não disponível"));
        return;
      }

      const gltfLoader = new THREE.GLTFLoader();
      if (THREE.DRACOLoader) {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/");
        gltfLoader.setDRACOLoader(dracoLoader);
      }

      gltfLoader.load(
        url,
        resolve,
        (event) => {
          if (!event.total) return;
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          const text = loader.querySelector("span:last-child");
          if (text) text.textContent = `CARREGANDO CACHORRO... ${percent}%`;
        },
        reject
      );
    });
  }

  async function loadRealDog() {
    let lastError = null;

    for (const url of REAL_DOG_MODELS) {
      try {
        return await loadModel(url);
      } catch (error) {
        lastError = error;
        console.warn("Não foi possível carregar este modelo de cachorro:", url, error);
      }
    }

    throw lastError || new Error("Nenhum modelo de cachorro pôde ser carregado");
  }

  try {
    const gltf = await loadRealDog();
    const prepared = prepareRealDog(gltf.scene);
    dogRoot = prepared.wrapper;
    dogModel = prepared.model;
    scene.add(dogRoot);

    // Não iniciamos automaticamente os clips importados do GLB.
    // Alguns modelos têm animações de locomoção que deslocam o cachorro para fora do quadro.
    // A interação do usuário já movimenta o grupo sem quebrar o enquadramento.
  } catch (error) {
    // Fallback: mantém a página funcionando mesmo se a escola bloquear o host do GLB.
    console.error("Falha ao carregar o cachorro realista. Usando modelo reserva:", error);
    usingFallbackDog = true;
    dogRoot = createGoldenRetriever();
    dogRoot.position.y = -0.05;
    dogRoot.rotation.y = -0.18;
    scene.add(dogRoot);
  }

  dogBaseY = dogRoot.position.y;

  const bones = [];
  const boneStart = [
    [-2.35, 1.7, 0.35, -0.45, 0.25],
    [2.25, 1.45, 0.2, 0.4, -0.35],
    [-2.45, -0.6, 0.45, 0.25, 0.55],
    [2.4, -0.85, 0.3, -0.2, -0.45],
    [0.1, 2.45, -0.25, 0.25, 0.1],
  ];

  boneStart.forEach(([x, y, z, rz, ry], index) => {
    const bone = createBone();
    bone.position.set(x, y, z);
    bone.rotation.z = rz;
    bone.rotation.y = ry;
    bone.scale.setScalar(index === 4 ? 0.7 : 0.82 + index * 0.025);
    bone.userData = {
      isBone: true,
      index,
      baseZ: z,
      floatSeed: index * 1.93 + 0.7,
      spinX: 0.003 + index * 0.0004,
      spinY: 0.004 + index * 0.0003,
      spinZ: 0.0025 + index * 0.0002,
      dragging: false,
    };
    bones.push(bone);
    scene.add(bone);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const dragPoint = new THREE.Vector3();

  let draggingBone = null;
  let rotatingDog = false;
  let lastPointerX = 0;
  let pressX = 0;
  let pressY = 0;
  let pointerMoved = false;
  let pressedDog = false;
  let playfulUntil = 0;
  let targetDogRotation = dogRoot.rotation.y;
  let dogRotation = targetDogRotation;
  let pointerX = 0;
  let pointerY = 0;

  function setPointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointerX = pointer.x;
    pointerY = pointer.y;
    raycaster.setFromCamera(pointer, camera);
  }

  function getBoneFromObject(object) {
    let current = object;
    while (current && current !== scene) {
      if (current.userData?.isBone) return current;
      current = current.parent;
    }
    return null;
  }

  function hoveredBone(event) {
    setPointerFromEvent(event);
    const hits = raycaster.intersectObjects(bones, true);
    return hits.length ? getBoneFromObject(hits[0].object) : null;
  }

  function pointerHitsDog() {
    return raycaster.intersectObject(dogRoot, true).length > 0;
  }

  canvas.addEventListener("pointerdown", (event) => {
    setPointerFromEvent(event);
    const hits = raycaster.intersectObjects(bones, true);

    pressX = event.clientX;
    pressY = event.clientY;
    pointerMoved = false;
    pressedDog = false;

    if (hits.length) {
      draggingBone = getBoneFromObject(hits[0].object);
      if (draggingBone) {
        draggingBone.userData.dragging = true;
        dragPlane.set(new THREE.Vector3(0, 0, 1), -draggingBone.position.z);
        canvas.style.cursor = "grabbing";
        canvas.setPointerCapture?.(event.pointerId);
        event.preventDefault();
        return;
      }
    }

    pressedDog = pointerHitsDog();
    rotatingDog = true;
    lastPointerX = event.clientX;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    setPointerFromEvent(event);

    if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 6) {
      pointerMoved = true;
    }

    if (draggingBone) {
      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        draggingBone.position.x = THREE.MathUtils.clamp(dragPoint.x, -3.0, 3.0);
        draggingBone.position.y = THREE.MathUtils.clamp(dragPoint.y, -2.0, 2.55);
        draggingBone.rotation.z += event.movementX * 0.01;
        draggingBone.rotation.x += event.movementY * 0.007;
      }
      return;
    }

    if (rotatingDog) {
      const deltaX = event.clientX - lastPointerX;
      lastPointerX = event.clientX;
      targetDogRotation += deltaX * 0.008;
      return;
    }

    canvas.style.cursor = hoveredBone(event) ? "grab" : (pointerHitsDog() ? "pointer" : "grab");
  });

  function endPointer(event) {
    if (draggingBone) {
      draggingBone.userData.dragging = false;
      draggingBone.userData.spinY += (Math.random() - 0.5) * 0.012;
      draggingBone.userData.spinZ += (Math.random() - 0.5) * 0.012;
      draggingBone = null;
    } else if (pressedDog && !pointerMoved) {
      // Clique curto no cachorro: pequena reação para a brincadeira infantil.
      playfulUntil = performance.now() + 1150;
    }

    rotatingDog = false;
    pressedDog = false;
    canvas.style.cursor = "grab";
    try { canvas.releasePointerCapture?.(event.pointerId); } catch (_) { /* nada */ }
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  frame.addEventListener("pointermove", (event) => {
    if (!canHover || draggingBone || rotatingDog) return;
    const rect = frame.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    frame.style.transform = `perspective(1400px) rotateY(${px * 7 - 5}deg) rotateX(${py * -5 + 1.5}deg)`;
  });

  frame.addEventListener("pointerleave", () => {
    if (!canHover) return;
    frame.style.transform = "perspective(1400px) rotateY(-5deg) rotateX(1.5deg)";
  });

  function createGoldenRetriever() {
    const dog = new THREE.Group();
    dog.userData.type = "golden-retriever-fallback";
    dog.userData.isProceduralFallback = true;

    const fur = new THREE.MeshPhysicalMaterial({
      color: 0xdca15a,
      roughness: 0.78,
      metalness: 0,
      clearcoat: 0.06,
      clearcoatRoughness: 0.72,
    });

    const furLight = new THREE.MeshPhysicalMaterial({
      color: 0xf0c781,
      roughness: 0.82,
      clearcoat: 0.04,
    });

    const furDeep = new THREE.MeshStandardMaterial({
      color: 0xb46e3b,
      roughness: 0.84,
    });

    const dark = new THREE.MeshPhysicalMaterial({
      color: 0x17120f,
      roughness: 0.28,
      metalness: 0.02,
      clearcoat: 0.36,
      clearcoatRoughness: 0.2,
    });

    const eyeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x120d0b,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });

    const tongueMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd87987,
      roughness: 0.62,
      clearcoat: 0.16,
    });

    const collarMaterial = new THREE.MeshStandardMaterial({
      color: 0x6c3d2a,
      roughness: 0.48,
      metalness: 0.05,
    });

    const tagMaterial = new THREE.MeshStandardMaterial({
      color: 0xd8a53e,
      roughness: 0.28,
      metalness: 0.68,
    });

    function ellipsoid(radius, scale, material, position, segments = 44) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(24, Math.floor(segments * 0.65))), material);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    // Corpo e peito.
    const body = ellipsoid(1, [1.02, 1.37, 0.8], fur, [0, -0.35, 0], 56);
    body.rotation.x = -0.05;
    dog.add(body);

    const chest = ellipsoid(0.72, [0.82, 1.2, 0.78], furLight, [0, -0.32, 0.62], 50);
    dog.add(chest);

    // Pescoço e cabeça.
    const neck = ellipsoid(0.66, [0.88, 1.05, 0.86], fur, [0, 0.55, 0.12], 46);
    dog.add(neck);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.14, 0.24);
    dog.add(headPivot);

    const head = ellipsoid(0.7, [0.92, 1.0, 0.9], fur, [0, 0, 0], 60);
    headPivot.add(head);

    // Orelhas caídas de retriever.
    const leftEar = ellipsoid(0.48, [0.6, 1.05, 0.22], furDeep, [-0.58, -0.02, 0.02], 44);
    leftEar.rotation.z = -0.2;
    leftEar.rotation.x = -0.08;
    headPivot.add(leftEar);

    const rightEar = ellipsoid(0.48, [0.6, 1.05, 0.22], furDeep, [0.58, -0.02, 0.02], 44);
    rightEar.rotation.z = 0.2;
    rightEar.rotation.x = -0.08;
    headPivot.add(rightEar);

    // Focinho em duas massas para dar volume real.
    const cheekL = ellipsoid(0.34, [0.92, 0.7, 0.9], furLight, [-0.18, -0.12, 0.58], 42);
    const cheekR = ellipsoid(0.34, [0.92, 0.7, 0.9], furLight, [0.18, -0.12, 0.58], 42);
    headPivot.add(cheekL, cheekR);

    const muzzle = ellipsoid(0.33, [0.96, 0.68, 0.92], furLight, [0, -0.16, 0.64], 46);
    headPivot.add(muzzle);

    const nose = ellipsoid(0.22, [1.0, 0.72, 0.72], dark, [0, -0.05, 0.92], 38);
    nose.rotation.x = -0.16;
    headPivot.add(nose);

    // Narinas.
    [-0.075, 0.075].forEach((x) => {
      const nostril = ellipsoid(0.037, [1.1, 0.6, 0.4], new THREE.MeshStandardMaterial({ color: 0x050403 }), [x, -0.05, 1.06], 20);
      headPivot.add(nostril);
    });

    // Olhos + brilhos.
    [-0.26, 0.26].forEach((x) => {
      const eye = ellipsoid(0.095, [1, 1.08, 0.55], eyeMaterial, [x, 0.18, 0.62], 30);
      headPivot.add(eye);

      const glint = ellipsoid(0.026, [1, 1, 0.5], new THREE.MeshBasicMaterial({ color: 0xffffff }), [x - 0.023, 0.21, 0.672], 16);
      headPivot.add(glint);
    });

    // Boca e língua.
    const mouth = ellipsoid(0.31, [0.9, 0.42, 0.52], dark, [0, -0.39, 0.7], 34);
    headPivot.add(mouth);

    const tongue = ellipsoid(0.23, [0.68, 1.15, 0.28], tongueMaterial, [0, -0.56, 0.88], 34);
    tongue.rotation.x = -0.15;
    tongue.userData.isTongue = true;
    headPivot.add(tongue);

    // Coleira e medalha.
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.075, 14, 60), collarMaterial);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.58, 0.17);
    collar.castShadow = true;
    dog.add(collar);

    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 36), tagMaterial);
    tag.rotation.x = Math.PI / 2;
    tag.position.set(0, 0.46, 0.72);
    tag.castShadow = true;
    dog.add(tag);

    // Patas dianteiras.
    [-0.44, 0.44].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.25, 28), fur);
      leg.position.set(x, -1.22, 0.5);
      leg.castShadow = true;
      dog.add(leg);

      const paw = ellipsoid(0.31, [1.1, 0.56, 1.3], furLight, [x, -1.9, 0.6], 38);
      dog.add(paw);
    });

    // Coxas traseiras e pés.
    [-0.78, 0.78].forEach((x) => {
      const thigh = ellipsoid(0.58, [0.86, 0.92, 0.8], furDeep, [x, -1.13, -0.05], 44);
      dog.add(thigh);

      const hindPaw = ellipsoid(0.34, [1.2, 0.58, 1.25], furLight, [x, -1.84, 0.16], 34);
      dog.add(hindPaw);
    });

    // Cauda feita de vários volumes para parecer curva e peluda.
    const tailPivot = new THREE.Group();
    tailPivot.position.set(-0.92, -0.65, -0.12);
    tailPivot.rotation.z = -0.46;
    tailPivot.userData.isTail = true;
    dog.add(tailPivot);

    const tailPoints = [
      [0, 0, 0, 0.27],
      [-0.32, 0.28, -0.02, 0.25],
      [-0.56, 0.62, -0.03, 0.22],
      [-0.67, 0.98, 0, 0.18],
      [-0.63, 1.28, 0.02, 0.13],
    ];

    tailPoints.forEach(([x, y, z, r]) => {
      const part = ellipsoid(r, [1.0, 1.55, 0.72], furDeep, [x, y, z], 34);
      part.rotation.z = 0.3;
      tailPivot.add(part);
    });

    // Detalhes de pelo no modelo reserva.
    addFurTufts(dog, furLight, furDeep);

    // Referências para animação.
    dog.userData.headPivot = headPivot;
    dog.userData.leftEar = leftEar;
    dog.userData.rightEar = rightEar;
    dog.userData.tailPivot = tailPivot;
    dog.userData.tongue = tongue;

    dog.scale.setScalar(1.04);
    dog.position.set(0, -0.02, 0);
    return dog;
  }

  function addFurTufts(dog, lightMaterial, deepMaterial) {
    const tuftGeometry = new THREE.ConeGeometry(0.035, 0.18, 5);
    tuftGeometry.translate(0, -0.09, 0);

    const chestTufts = [];
    for (let row = 0; row < 7; row += 1) {
      const count = 4 + row;
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0 : i / (count - 1);
        const x = (t - 0.5) * (0.36 + row * 0.08);
        const y = 0.03 - row * 0.13;
        const z = 1.05 - Math.abs(x) * 0.18;
        chestTufts.push([x, y, z, (t - 0.5) * 0.35]);
      }
    }

    chestTufts.forEach(([x, y, z, rz], index) => {
      const tuft = new THREE.Mesh(tuftGeometry, index % 3 === 0 ? deepMaterial : lightMaterial);
      tuft.position.set(x, y, z);
      tuft.rotation.x = Math.PI / 2.1;
      tuft.rotation.z = rz;
      tuft.castShadow = true;
      dog.add(tuft);
    });

    const sideTuftGeometry = new THREE.ConeGeometry(0.025, 0.14, 5);
    sideTuftGeometry.translate(0, -0.07, 0);

    [-1, 1].forEach((side) => {
      for (let i = 0; i < 10; i += 1) {
        const tuft = new THREE.Mesh(sideTuftGeometry, deepMaterial);
        tuft.position.set(side * (0.58 + (i % 3) * 0.025), 1.31 - i * 0.09, 0.32 - (i % 2) * 0.05);
        tuft.rotation.z = side * (1.2 + (i % 3) * 0.06);
        tuft.rotation.x = 0.2;
        dog.add(tuft);
      }
    });
  }

  function createBone() {
    const group = new THREE.Group();
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf5e3c2,
      roughness: 0.72,
      metalness: 0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.62,
    });

    const shadowMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7bea0,
      roughness: 0.84,
    });

    // Haste levemente afunilada, parecendo mais um osso real do que um cilindro perfeito.
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.88, 32), material);
    shaft.rotation.z = Math.PI / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);

    const ends = [
      [-0.47, 0.12, 0, 1.0, 0.88, 0.84],
      [-0.47, -0.12, 0, 0.96, 0.84, 0.82],
      [0.47, 0.12, 0, 1.0, 0.88, 0.84],
      [0.47, -0.12, 0, 0.96, 0.84, 0.82],
    ];

    ends.forEach(([x, y, z, sx, sy, sz], index) => {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.175, 30, 22), index % 2 ? shadowMaterial : material);
      knob.position.set(x, y, z);
      knob.scale.set(sx, sy, sz);
      knob.castShadow = true;
      knob.receiveShadow = true;
      group.add(knob);
    });

    // Pequenos volumes centrais quebram a forma perfeita e deixam o osso mais orgânico.
    [-0.31, 0.31].forEach((x) => {
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 18), material);
      joint.position.set(x, 0, 0);
      joint.scale.set(0.8, 0.72, 0.72);
      joint.castShadow = true;
      group.add(joint);
    });

    return group;
  }

  function resizeRenderer() {
    const width = Math.max(frame.clientWidth, 1);
    const height = Math.max(frame.clientHeight, 1);
    const aspect = width / height;

    renderer.setSize(width, height, false);
    camera.aspect = aspect;

    // Em telas estreitas afastamos um pouco a câmera para não cortar o cachorro.
    camera.position.z = aspect < 0.82 ? 10.6 : aspect < 1.05 ? 9.7 : 8.8;
    camera.position.y = aspect < 0.82 ? 0.45 : 0.55;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(frame);
  resizeRenderer();

  loader.classList.add("hidden");

  let previousTime = performance.now();
  let blink = 1;

  function render(time) {
    const seconds = time * 0.001;
    const dt = Math.min((time - previousTime) / 16.67, 2.5);
    previousTime = time;

    if (!rotatingDog) {
      targetDogRotation += Math.sin(seconds * 0.22) * 0.00012 * dt;
    }

    // Quando uma criança segura um osso, o cachorro vira um pouco na direção dele.
    if (draggingBone) {
      const lookAtBone = THREE.MathUtils.clamp(draggingBone.position.x * 0.13, -0.38, 0.38);
      targetDogRotation += (lookAtBone - targetDogRotation) * 0.018;
    }

    dogRotation += (targetDogRotation - dogRotation) * 0.075;
    dogRoot.rotation.y = dogRotation;

    const deltaSeconds = Math.min((dt * 16.67) / 1000, 0.05);
    if (dogMixer) dogMixer.update(deltaSeconds);

    if (usingFallbackDog) {
      // Animações do modelo reserva criado por geometria.
      const headPivot = dogRoot.userData.headPivot;
      const tailPivot = dogRoot.userData.tailPivot;
      const tongue = dogRoot.userData.tongue;

      if (headPivot) {
        headPivot.rotation.y += (pointerX * 0.17 - headPivot.rotation.y) * 0.045;
        headPivot.rotation.x += (-pointerY * 0.085 - headPivot.rotation.x) * 0.045;

        const blinkPhase = seconds % 5.4;
        const blinkTarget = blinkPhase > 4.95 && blinkPhase < 5.12 ? 0.985 : 1;
        blink += (blinkTarget - blink) * 0.2;
        headPivot.scale.y = blink;
      }

      if (tailPivot) {
        tailPivot.rotation.y = Math.sin(seconds * 5.1) * 0.27;
        tailPivot.rotation.z = -0.46 + Math.sin(seconds * 2.5) * 0.035;
      }

      if (tongue) {
        tongue.position.y = -0.56 + Math.sin(seconds * 3.3) * 0.018;
      }

      const breathe = 1 + Math.sin(seconds * 1.7) * 0.006;
      dogRoot.scale.set(1.04 * breathe, 1.04, 1.04 * breathe);
    } else {
      // Movimento sutil do modelo realista em direção ao ponteiro.
      dogRoot.rotation.x += (pointerY * -0.025 - dogRoot.rotation.x) * 0.025;
      dogRoot.rotation.z += (pointerX * -0.018 - dogRoot.rotation.z) * 0.025;
    }

    // Reação ao clique: um pulinho e uma balançada curta.
    const playfulLeft = Math.max(0, playfulUntil - time);
    if (playfulLeft > 0) {
      const strength = playfulLeft / 1150;
      const bounce = Math.abs(Math.sin((1 - strength) * Math.PI * 5)) * 0.12 * strength;
      dogRoot.position.y = dogBaseY + bounce;
      dogRoot.rotation.z += Math.sin(time * 0.028) * 0.035 * strength;
    } else {
      dogRoot.position.y += (dogBaseY - dogRoot.position.y) * 0.12;
    }

    bones.forEach((bone) => {
      if (bone.userData.dragging) return;

      const seed = bone.userData.floatSeed;
      bone.position.y += Math.sin(seconds * 1.35 + seed) * 0.0015 * dt;
      bone.position.z = bone.userData.baseZ + Math.sin(seconds * 1.05 + seed) * 0.12;
      bone.rotation.x += bone.userData.spinX * dt;
      bone.rotation.y += bone.userData.spinY * dt;
      bone.rotation.z += bone.userData.spinZ * dt;
    });

    backRing.rotation.z = seconds * 0.055;
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

/* ------------------------------
   INICIALIZAÇÃO
-------------------------------- */
showOnly("placeholder");
loadBreeds();
initDogVisual();
