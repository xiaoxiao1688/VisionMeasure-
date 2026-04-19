const elements = {
  annotationCount: document.querySelector("#annotation-count"),
  annotationList: document.querySelector("#annotation-list"),
  canvas: document.querySelector("#draft-canvas"),
  clearButton: document.querySelector("#clear-button"),
  fileName: document.querySelector("#file-name"),
  imageLoader: document.querySelector("#image-loader"),
  imageSize: document.querySelector("#image-size"),
  overlay: document.querySelector("#canvas-overlay"),
  projectName: document.querySelector("#project-name"),
  saveButton: document.querySelector("#save-button"),
  selectionSize: document.querySelector("#selection-size"),
  statusLine: document.querySelector("#status-line"),
  toolButtons: [...document.querySelectorAll("[data-tool]")],
};

const state = {
  annotations: [],
  currentTool: "rectangle",
  drawing: false,
  draftAnnotation: null,
  image: null,
  imageName: "",
  imagePlacement: null,
  pointerStart: null,
  polygonPoints: [],
  selectedId: null,
};

const ctx = elements.canvas.getContext("2d");
const canvasContainer = elements.canvas.parentElement;

function setStatus(message, tone = "default") {
  elements.statusLine.textContent = message;
  elements.statusLine.style.background =
    tone === "error" ? "rgba(184, 79, 37, 0.12)" : "rgba(35, 106, 76, 0.08)";
  elements.statusLine.style.color = tone === "error" ? "#b84f25" : "#236a4c";
}

function getToolInstructions(tool = state.currentTool) {
  if (tool === "line") {
    return "Line tool active. Drag between two points to record a distance.";
  }

  if (tool === "polygon") {
    return "Polygon tool active. Click to add vertices, then double-click to close and measure area.";
  }

  return "Rectangle tool active. Drag anywhere on the image to create a measurement box.";
}

function syncCanvasSize() {
  const bounds = canvasContainer.getBoundingClientRect();
  const width = Math.max(320, Math.floor(bounds.width));
  const height = Math.max(320, Math.floor(bounds.height));

  if (elements.canvas.width !== width || elements.canvas.height !== height) {
    elements.canvas.width = width;
    elements.canvas.height = height;
  }

  computeImagePlacement();
  drawScene();
}

function computeImagePlacement() {
  if (!state.image) {
    state.imagePlacement = null;
    return;
  }

  const padding = 36;
  const availableWidth = elements.canvas.width - padding * 2;
  const availableHeight = elements.canvas.height - padding * 2;
  const scale = Math.min(
    availableWidth / state.image.width,
    availableHeight / state.image.height,
    1
  );

  const drawWidth = state.image.width * scale;
  const drawHeight = state.image.height * scale;

  state.imagePlacement = {
    scale,
    x: (elements.canvas.width - drawWidth) / 2,
    y: (elements.canvas.height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  };
}

function drawScene() {
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

  if (!state.image || !state.imagePlacement) {
    drawEmptyCanvas();
    return;
  }

  const placement = state.imagePlacement;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 30;
  ctx.drawImage(state.image, placement.x, placement.y, placement.width, placement.height);
  ctx.restore();

  state.annotations.forEach((annotation) => drawAnnotation(annotation));

  if (state.draftAnnotation && state.draftAnnotation.type !== "polygon-preview") {
    drawAnnotation({ ...state.draftAnnotation, id: "draft" }, true);
  }

  if (state.currentTool === "polygon" && state.polygonPoints.length) {
    drawPolygonDraft();
  }
}

function drawEmptyCanvas() {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.font = '600 20px "Aptos", "Segoe UI Variable Text", sans-serif';
  ctx.fillText("Load an image to start annotating.", 32, 42);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = '400 14px "Aptos", "Segoe UI Variable Text", sans-serif';
  ctx.fillText("The current prototype supports rectangle, line, polygon, and JSON export.", 32, 68);
  ctx.restore();
}

function drawAnnotation(annotation, isDraft = false) {
  if (!state.imagePlacement) {
    return;
  }

  if (annotation.type === "line") {
    drawLineAnnotation(annotation, isDraft);
    return;
  }

  if (annotation.type === "polygon") {
    drawPolygonAnnotation(annotation, isDraft);
    return;
  }

  drawRectangleAnnotation(annotation, isDraft);
}

function drawRectangleAnnotation(annotation, isDraft) {
  const placement = state.imagePlacement;
  const selected = annotation.id === state.selectedId;
  const x = placement.x + annotation.x * placement.scale;
  const y = placement.y + annotation.y * placement.scale;
  const width = annotation.width * placement.scale;
  const height = annotation.height * placement.scale;
  const label = `${Math.round(annotation.width)} x ${Math.round(annotation.height)} px`;

  ctx.save();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? "#ffd18a" : "#ff8f62";
  ctx.fillStyle = isDraft ? "rgba(255, 143, 98, 0.12)" : "rgba(255, 143, 98, 0.18)";
  ctx.strokeRect(x, y, width, height);
  ctx.fillRect(x, y, width, height);
  drawLabel(x, Math.max(placement.y, y - 28), label);
  ctx.restore();
}

function drawLineAnnotation(annotation, isDraft) {
  const placement = state.imagePlacement;
  const selected = annotation.id === state.selectedId;
  const startX = placement.x + annotation.start.x * placement.scale;
  const startY = placement.y + annotation.start.y * placement.scale;
  const endX = placement.x + annotation.end.x * placement.scale;
  const endY = placement.y + annotation.end.y * placement.scale;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const label = `${Math.round(annotation.length)} px`;

  ctx.save();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? "#8ae6ff" : "#55d5ff";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  drawVertex(startX, startY, selected);
  drawVertex(endX, endY, selected);
  drawLabel(midX - 32, midY - 32, label);
  ctx.restore();
}

function drawPolygonAnnotation(annotation, isDraft) {
  const placement = state.imagePlacement;
  const selected = annotation.id === state.selectedId;
  const points = annotation.points.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));
  const centroid = getPolygonCentroid(points);
  const label = `${Math.round(annotation.area)} px^2`;

  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? "#b8ff8a" : "#8ae35f";
  ctx.fillStyle = isDraft ? "rgba(138, 227, 95, 0.12)" : "rgba(138, 227, 95, 0.22)";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  points.forEach((point) => drawVertex(point.x, point.y, selected));
  drawLabel(centroid.x - 36, centroid.y - 14, label);
  ctx.restore();
}

function drawPolygonDraft() {
  const placement = state.imagePlacement;
  const points = state.polygonPoints.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

  if (!points.length) {
    return;
  }

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#8ae35f";
  ctx.fillStyle = "rgba(138, 227, 95, 0.1)";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  if (state.draftAnnotation && state.draftAnnotation.type === "polygon-preview") {
    const previewX = placement.x + state.draftAnnotation.previewPoint.x * placement.scale;
    const previewY = placement.y + state.draftAnnotation.previewPoint.y * placement.scale;
    ctx.lineTo(previewX, previewY);
  }
  ctx.stroke();
  points.forEach((point) => drawVertex(point.x, point.y, false));
  ctx.restore();
}

function drawVertex(x, y, selected) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = selected ? "#fff1c9" : "#ffffff";
  ctx.arc(x, y, selected ? 5 : 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLabel(x, y, label) {
  const safeX = Math.max(12, Math.min(x, elements.canvas.width - 160));
  const safeY = Math.max(12, Math.min(y, elements.canvas.height - 36));
  ctx.font = '600 13px "Aptos", "Segoe UI Variable Text", sans-serif';
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(10, 16, 19, 0.86)";
  ctx.fillRect(safeX, safeY, textWidth + 18, 24);
  ctx.fillStyle = "#fff3e8";
  ctx.fillText(label, safeX + 9, safeY + 17);
}

function pointerToImageCoordinates(event) {
  if (!state.imagePlacement) {
    return null;
  }

  const bounds = elements.canvas.getBoundingClientRect();
  const canvasX = event.clientX - bounds.left;
  const canvasY = event.clientY - bounds.top;
  const placement = state.imagePlacement;

  const insideX = canvasX >= placement.x && canvasX <= placement.x + placement.width;
  const insideY = canvasY >= placement.y && canvasY <= placement.y + placement.height;

  if (!insideX || !insideY) {
    return null;
  }

  return {
    x: (canvasX - placement.x) / placement.scale,
    y: (canvasY - placement.y) / placement.scale,
  };
}

function normalizeRectangle(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    id: crypto.randomUUID(),
    type: "rectangle",
    x,
    y,
    width,
    height,
    area: width * height,
  };
}

function createLineAnnotation(start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  return {
    id: crypto.randomUUID(),
    type: "line",
    start,
    end,
    length: Math.hypot(deltaX, deltaY),
  };
}

function createPolygonAnnotation(points) {
  return {
    id: crypto.randomUUID(),
    type: "polygon",
    points,
    area: getPolygonArea(points),
    perimeter: getPolygonPerimeter(points),
  };
}

function getPolygonArea(points) {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2;
}

function getPolygonPerimeter(points) {
  let perimeter = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    perimeter += Math.hypot(next.x - current.x, next.y - current.y);
  }

  return perimeter;
}

function getPolygonCentroid(points) {
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function getAnnotationSummary(annotation) {
  if (annotation.type === "line") {
    return {
      title: `Line ${Math.round(annotation.length)} px`,
      meta: `From (${Math.round(annotation.start.x)}, ${Math.round(annotation.start.y)}) to (${Math.round(annotation.end.x)}, ${Math.round(annotation.end.y)})`,
      selection: `${Math.round(annotation.length)} px`,
    };
  }

  if (annotation.type === "polygon") {
    return {
      title: `Polygon ${Math.round(annotation.area)} px^2`,
      meta: `${annotation.points.length} vertices, perimeter ${Math.round(annotation.perimeter)} px`,
      selection: `${Math.round(annotation.area)} px^2`,
    };
  }

  return {
    title: `${Math.round(annotation.width)} x ${Math.round(annotation.height)} px`,
    meta: `Area ${Math.round(annotation.area)} px^2, origin (${Math.round(annotation.x)}, ${Math.round(annotation.y)})`,
    selection: `${Math.round(annotation.width)} x ${Math.round(annotation.height)}`,
  };
}

function updateToolButtons() {
  elements.toolButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === state.currentTool);
  });
}

function resetDraftState() {
  state.drawing = false;
  state.pointerStart = null;
  state.draftAnnotation = null;
  state.polygonPoints = [];
}

function refreshOverlay() {
  const headline = state.imageName || "Canvas ready.";
  const message = state.image ? getToolInstructions() : "Load a local image to start measuring.";
  elements.overlay.innerHTML = `<strong>${headline}</strong><span>${message}</span>`;
}

function setCurrentTool(tool) {
  state.currentTool = tool;
  resetDraftState();
  updateToolButtons();
  refreshOverlay();
  setStatus(getToolInstructions(tool));
  drawScene();
}

function renderAnnotationList() {
  elements.annotationCount.textContent = String(state.annotations.length);

  if (!state.annotations.length) {
    elements.annotationList.innerHTML = '<li class="empty-state">No annotations yet.</li>';
    elements.selectionSize.textContent = "None";
    return;
  }

  const items = [...state.annotations]
    .reverse()
    .map((annotation) => {
      const activeClass = annotation.id === state.selectedId ? "annotation-item active" : "annotation-item";
      const summary = getAnnotationSummary(annotation);
      return `
        <li class="${activeClass}" data-id="${annotation.id}">
          <p class="annotation-title">${summary.title}</p>
          <p class="annotation-meta">${summary.meta}</p>
        </li>
      `;
    })
    .join("");

  elements.annotationList.innerHTML = items;

  const selected = state.annotations.find((annotation) => annotation.id === state.selectedId);
  elements.selectionSize.textContent = selected ? getAnnotationSummary(selected).selection : "None";
}

function selectAnnotation(id) {
  state.selectedId = id;
  renderAnnotationList();
  drawScene();
}

function loadImage(file) {
  if (!file) {
    elements.fileName.textContent = "No image selected";
    return;
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.onload = () => {
    state.image = image;
    state.imageName = file.name;
    state.annotations = [];
    state.selectedId = null;
    resetDraftState();
    elements.fileName.textContent = file.name;
    elements.imageSize.textContent = `${image.width} x ${image.height}`;
    refreshOverlay();
    setStatus(`Image loaded. ${getToolInstructions()}`);
    computeImagePlacement();
    renderAnnotationList();
    drawScene();
    URL.revokeObjectURL(objectUrl);
  };

  image.onerror = () => {
    elements.fileName.textContent = "No image selected";
    setStatus("The selected file could not be opened as an image.", "error");
    URL.revokeObjectURL(objectUrl);
  };

  image.src = objectUrl;
}

async function saveAnnotations() {
  if (!state.image) {
    setStatus("Load an image before saving.", "error");
    return;
  }

  const payload = {
    projectName: elements.projectName.value.trim() || "GeoDraft Prototype",
    imageMeta: {
      name: state.imageName,
      width: state.image.width,
      height: state.image.height,
    },
    annotations: state.annotations.map((annotation) => ({
      id: annotation.id,
      type: annotation.type,
      x: annotation.x !== undefined ? Number(annotation.x.toFixed(2)) : undefined,
      y: annotation.y !== undefined ? Number(annotation.y.toFixed(2)) : undefined,
      width: annotation.width !== undefined ? Number(annotation.width.toFixed(2)) : undefined,
      height: annotation.height !== undefined ? Number(annotation.height.toFixed(2)) : undefined,
      area: annotation.area !== undefined ? Number(annotation.area.toFixed(2)) : undefined,
      length: annotation.length !== undefined ? Number(annotation.length.toFixed(2)) : undefined,
      perimeter: annotation.perimeter !== undefined ? Number(annotation.perimeter.toFixed(2)) : undefined,
      start: annotation.start
        ? {
            x: Number(annotation.start.x.toFixed(2)),
            y: Number(annotation.start.y.toFixed(2)),
          }
        : undefined,
      end: annotation.end
        ? {
            x: Number(annotation.end.x.toFixed(2)),
            y: Number(annotation.end.y.toFixed(2)),
          }
        : undefined,
      points: annotation.points
        ? annotation.points.map((point) => ({
            x: Number(point.x.toFixed(2)),
            y: Number(point.y.toFixed(2)),
          }))
        : undefined,
    })),
  };

  try {
    const response = await fetch("/api/annotations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "Save failed.");
    }

    setStatus(`Saved ${state.annotations.length} annotation(s) to ${body.file}.`);
  } catch (error) {
    setStatus(error.message || "Save failed.", "error");
  }
}

function finalizePolygon() {
  if (state.polygonPoints.length < 3) {
    setStatus("A polygon needs at least three vertices.", "error");
    return;
  }

  const polygon = createPolygonAnnotation([...state.polygonPoints]);
  if (polygon.area < 16) {
    setStatus("Ignored a polygon that was too small to be useful.", "error");
    resetDraftState();
    drawScene();
    return;
  }

  state.annotations.push(polygon);
  state.selectedId = polygon.id;
  resetDraftState();
  renderAnnotationList();
  drawScene();
  setStatus(`Added polygon area ${Math.round(polygon.area)} px^2.`);
}

elements.imageLoader.addEventListener("change", (event) => {
  const [file] = event.target.files;
  loadImage(file);
});

elements.toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setCurrentTool(button.dataset.tool);
  });
});

elements.canvas.addEventListener("pointerdown", (event) => {
  if (!state.image) {
    setStatus("Load an image before drawing.", "error");
    return;
  }

  const point = pointerToImageCoordinates(event);
  if (!point) {
    return;
  }

  state.selectedId = null;

  if (state.currentTool === "polygon") {
    state.polygonPoints.push(point);
    state.draftAnnotation = null;
    renderAnnotationList();
    drawScene();
    setStatus(`Added polygon vertex ${state.polygonPoints.length}. Double-click to finish.`);
    return;
  }

  state.drawing = true;
  state.pointerStart = point;
  state.draftAnnotation =
    state.currentTool === "line" ? createLineAnnotation(point, point) : normalizeRectangle(point, point);
  drawScene();
});

elements.canvas.addEventListener("pointermove", (event) => {
  if (state.currentTool === "polygon") {
    const point = pointerToImageCoordinates(event);
    state.draftAnnotation =
      state.polygonPoints.length && point ? { type: "polygon-preview", previewPoint: point } : null;
    drawScene();
    return;
  }

  if (!state.drawing || !state.pointerStart) {
    return;
  }

  const point = pointerToImageCoordinates(event);
  if (!point) {
    return;
  }

  state.draftAnnotation =
    state.currentTool === "line"
      ? createLineAnnotation(state.pointerStart, point)
      : normalizeRectangle(state.pointerStart, point);
  drawScene();
});

elements.canvas.addEventListener("pointerup", (event) => {
  if (state.currentTool === "polygon") {
    return;
  }

  if (!state.drawing || !state.pointerStart) {
    return;
  }

  const point = pointerToImageCoordinates(event);
  state.drawing = false;

  if (!point) {
    state.pointerStart = null;
    state.draftAnnotation = null;
    drawScene();
    return;
  }

  const annotation =
    state.currentTool === "line"
      ? createLineAnnotation(state.pointerStart, point)
      : normalizeRectangle(state.pointerStart, point);
  state.pointerStart = null;
  state.draftAnnotation = null;

  const tooSmall =
    state.currentTool === "line"
      ? annotation.length < 4
      : annotation.width < 4 || annotation.height < 4;

  if (tooSmall) {
    setStatus(`Ignored a ${state.currentTool} annotation that was too small to be useful.`, "error");
    drawScene();
    return;
  }

  state.annotations.push(annotation);
  state.selectedId = annotation.id;
  renderAnnotationList();
  drawScene();
  setStatus(
    state.currentTool === "line"
      ? `Added line measurement ${Math.round(annotation.length)} px.`
      : `Added rectangle ${Math.round(annotation.width)} x ${Math.round(annotation.height)} px.`
  );
});

elements.canvas.addEventListener("pointerleave", () => {
  if (state.currentTool === "polygon") {
    state.draftAnnotation = null;
    drawScene();
    return;
  }

  if (!state.drawing) {
    return;
  }

  state.drawing = false;
  state.pointerStart = null;
  state.draftAnnotation = null;
  drawScene();
});

elements.canvas.addEventListener("dblclick", (event) => {
  if (state.currentTool !== "polygon") {
    return;
  }

  event.preventDefault();
  finalizePolygon();
});

document.addEventListener("keydown", (event) => {
  if (state.currentTool !== "polygon") {
    return;
  }

  if (event.key === "Enter") {
    finalizePolygon();
  }

  if (event.key === "Escape") {
    resetDraftState();
    drawScene();
    setStatus("Cancelled the current polygon draft.");
  }
});

elements.annotationList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-id]");
  if (!item) {
    return;
  }

  selectAnnotation(item.dataset.id);
});

elements.clearButton.addEventListener("click", () => {
  state.annotations = [];
  state.selectedId = null;
  resetDraftState();
  renderAnnotationList();
  drawScene();
  setStatus("All annotations were cleared.");
});

elements.saveButton.addEventListener("click", () => {
  saveAnnotations();
});

window.addEventListener("resize", syncCanvasSize);

renderAnnotationList();
updateToolButtons();
refreshOverlay();
syncCanvasSize();
