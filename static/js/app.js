const elements = {
  annotationCount: document.querySelector("#annotation-count"),
  annotationList: document.querySelector("#annotation-list"),
  canvas: document.querySelector("#draft-canvas"),
  clearButton: document.querySelector("#clear-button"),
  fileName: document.querySelector("#file-name"),
  historyList: document.querySelector("#history-list"),
  imageLoader: document.querySelector("#image-loader"),
  imageSize: document.querySelector("#image-size"),
  overlay: document.querySelector("#canvas-overlay"),
  projectName: document.querySelector("#project-name"),
  projectNotes: document.querySelector("#project-notes"),
  refreshHistory: document.querySelector("#refresh-history"),
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
  imageFile: null,
  imagePlacement: null,
  pointerStart: null,
  polygonPoints: [],
  selectedId: null,
  sessions: [],
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
    return "线条工具已激活。在两点之间拖动以记录距离。";
  }

  if (tool === "polygon") {
    return "多边形工具已激活。点击添加顶点，然后双击闭合并测量面积。";
  }

  return "矩形工具已激活。在图片上任意位置拖动以创建测量框。";
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
  ctx.fillText("加载图片开始标注。", 32, 42);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = '400 14px "Aptos", "Segoe UI Variable Text", sans-serif';
  ctx.fillText("当前原型支持矩形、线条、多边形和导出功能。", 32, 68);
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
      title: `线条 ${Math.round(annotation.length)} px`,
      meta: `从 (${Math.round(annotation.start.x)}, ${Math.round(annotation.start.y)}) 到 (${Math.round(annotation.end.x)}, ${Math.round(annotation.end.y)})`,
      selection: `${Math.round(annotation.length)} px`,
    };
  }

  if (annotation.type === "polygon") {
    return {
      title: `多边形 ${Math.round(annotation.area)} px^2`,
      meta: `${annotation.points.length} 个顶点, 周长 ${Math.round(annotation.perimeter)} px`,
      selection: `${Math.round(annotation.area)} px^2`,
    };
  }

  return {
    title: `${Math.round(annotation.width)} x ${Math.round(annotation.height)} px`,
    meta: `面积 ${Math.round(annotation.area)} px^2, 原点 (${Math.round(annotation.x)}, ${Math.round(annotation.y)})`,
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
  const headline = state.imageName || "画布就绪。";
  const message = state.image ? getToolInstructions() : "加载本地图片开始标注。";
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

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function renderAnnotationList() {
  elements.annotationCount.textContent = String(state.annotations.length);

  if (!state.annotations.length) {
    elements.annotationList.innerHTML = '<li class="empty-state">暂无标注。</li>';
    elements.selectionSize.textContent = "无";
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
  elements.selectionSize.textContent = selected ? getAnnotationSummary(selected).selection : "无";
}

function selectAnnotation(id) {
  state.selectedId = id;
  renderAnnotationList();
  drawScene();
}

function loadImage(file) {
  if (!file) {
    elements.fileName.textContent = "未选择图片";
    return;
  }

  state.imageFile = file;

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
    setStatus(`图片已加载。${getToolInstructions()}`);
    syncCanvasSize();
    renderAnnotationList();
    drawScene();
    URL.revokeObjectURL(objectUrl);
  };

  image.onerror = () => {
    elements.fileName.textContent = "未选择图片";
    setStatus("无法打开所选文件作为图片。", "error");
    URL.revokeObjectURL(objectUrl);
  };

  image.src = objectUrl;
}

function exportAnnotatedImage() {
  if (!state.image || !state.imagePlacement) {
    return null;
  }

  const placement = state.imagePlacement;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = state.image.width;
  tempCanvas.height = state.image.height;
  const tempCtx = tempCanvas.getContext("2d");

  tempCtx.drawImage(state.image, 0, 0);

  const scaleRatio = 1 / placement.scale;

  state.annotations.forEach((annotation) => {
    if (annotation.type === "rectangle") {
      tempCtx.lineWidth = 3;
      tempCtx.strokeStyle = "#ff8f62";
      tempCtx.fillStyle = "rgba(255, 143, 98, 0.18)";
      tempCtx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      tempCtx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
    } else if (annotation.type === "line") {
      tempCtx.lineWidth = 3;
      tempCtx.strokeStyle = "#55d5ff";
      tempCtx.beginPath();
      tempCtx.moveTo(annotation.start.x, annotation.start.y);
      tempCtx.lineTo(annotation.end.x, annotation.end.y);
      tempCtx.stroke();
    } else if (annotation.type === "polygon") {
      tempCtx.lineWidth = 3;
      tempCtx.strokeStyle = "#8ae35f";
      tempCtx.fillStyle = "rgba(138, 227, 95, 0.22)";
      tempCtx.beginPath();
      if (annotation.points.length > 0) {
        tempCtx.moveTo(annotation.points[0].x, annotation.points[0].y);
        for (let i = 1; i < annotation.points.length; i++) {
          tempCtx.lineTo(annotation.points[i].x, annotation.points[i].y);
        }
        tempCtx.closePath();
        tempCtx.fill();
        tempCtx.stroke();
      }
    }
  });

  return tempCanvas.toDataURL("image/png");
}

async function saveAnnotations() {
  if (!state.image) {
    setStatus("保存前请先加载图片。", "error");
    return;
  }

  const annotatedImageData = exportAnnotatedImage();
  if (!annotatedImageData) {
    setStatus("无法导出标注图片。", "error");
    return;
  }

  let originalImageData = null;
  if (state.imageFile) {
    try {
      const reader = new FileReader();
      originalImageData = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(state.imageFile);
      });
    } catch (e) {
      console.warn("无法读取原始图片:", e);
    }
  }

  const payload = {
    projectName: elements.projectName.value.trim() || "GeoDraft Prototype",
    projectNotes: elements.projectNotes.value.trim() || "",
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
    originalImage: originalImageData,
    annotatedImage: annotatedImageData,
  };

  try {
    setStatus("正在保存...");

    const response = await fetch("/api/annotations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "保存失败。");
    }

    setStatus(`已保存 ${state.annotations.length} 个标注。文件: ${body.filePrefix}`);
    await loadHistoryList();
  } catch (error) {
    setStatus(error.message || "保存失败。", "error");
  }
}

async function loadHistoryList() {
  try {
    const response = await fetch("/api/sessions", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "加载历史记录失败。");
    }

    state.sessions = body.sessions || [];
    renderHistoryList();
  } catch (error) {
    console.warn("加载历史记录失败:", error);
  }
}

function renderHistoryList() {
  if (!state.sessions.length) {
    elements.historyList.innerHTML = '<li class="empty-state">暂无保存的会话。</li>';
    return;
  }

  const items = state.sessions
    .map((session) => {
      const dateStr = formatDate(session.savedAt);
      const notesPreview = session.notes ? ` - ${session.notes.substring(0, 20)}${session.notes.length > 20 ? "..." : ""}` : "";
      return `
        <li class="history-item" data-filename="${session.filePrefix}">
          <p class="history-item-title">${session.projectName}${notesPreview}</p>
          <p class="history-item-meta">
            <span>${dateStr}</span>
            <span>${session.annotationCount} 个标注</span>
          </p>
        </li>
      `;
    })
    .join("");

  elements.historyList.innerHTML = items;
}

async function loadSession(filePrefix) {
  try {
    setStatus("正在加载会话...");

    const response = await fetch(`/api/sessions/${encodeURIComponent(filePrefix)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "加载会话失败。");
    }

    const projectName = body.projectName || "GeoDraft";
    const projectNotes = body.projectNotes || "";
    const annotations = body.annotations || [];
    const imageMeta = body.imageMeta || {};

    elements.projectName.value = projectName;
    elements.projectNotes.value = projectNotes;

    state.annotations = annotations;
    state.selectedId = null;

    if (body.annotatedImage) {
      const img = new Image();
      img.onload = () => {
        state.image = img;
        state.imageName = imageMeta.name || "已加载的图片";
        elements.fileName.textContent = state.imageName;
        elements.imageSize.textContent = img.width ? `${img.width} x ${img.height}` : "已加载";
        syncCanvasSize();
        renderAnnotationList();
        drawScene();
        setStatus(`已加载会话: ${projectName} (${annotations.length} 个标注)`);
      };
      img.onerror = () => {
        renderAnnotationList();
        setStatus(`已加载会话: ${projectName} (${annotations.length} 个标注)。请重新加载图片文件。`);
      };
      img.src = body.annotatedImage;
    } else {
      renderAnnotationList();
      setStatus(`已加载会话: ${projectName} (${annotations.length} 个标注)。请重新加载图片文件。`);
    }
  } catch (error) {
    setStatus(error.message || "加载会话失败。", "error");
  }
}

function finalizePolygon() {
  if (state.polygonPoints.length < 3) {
    setStatus("多边形至少需要三个顶点。", "error");
    return;
  }

  const polygon = createPolygonAnnotation([...state.polygonPoints]);
  if (polygon.area < 16) {
    setStatus("忽略了一个太小的多边形。", "error");
    resetDraftState();
    drawScene();
    return;
  }

  state.annotations.push(polygon);
  state.selectedId = polygon.id;
  resetDraftState();
  renderAnnotationList();
  drawScene();
  setStatus(`已添加多边形，面积 ${Math.round(polygon.area)} px^2。`);
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
    setStatus("绘制前请先加载图片。", "error");
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
    setStatus(`已添加多边形顶点 ${state.polygonPoints.length}。双击完成。`);
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
    setStatus(`忽略了一个太小的 ${state.currentTool} 标注。`, "error");
    drawScene();
    return;
  }

  state.annotations.push(annotation);
  state.selectedId = annotation.id;
  renderAnnotationList();
  drawScene();
  setStatus(
    state.currentTool === "line"
      ? `已添加线条测量 ${Math.round(annotation.length)} px。`
      : `已添加矩形 ${Math.round(annotation.width)} x ${Math.round(annotation.height)} px。`
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
    setStatus("已取消当前多边形绘制。");
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
  setStatus("已清除所有标注。");
});

elements.saveButton.addEventListener("click", () => {
  saveAnnotations();
});

elements.refreshHistory.addEventListener("click", () => {
  loadHistoryList();
  setStatus("已刷新历史记录。");
});

elements.historyList.addEventListener("click", (event) => {
  const historyItem = event.target.closest(".history-item");
  if (historyItem && historyItem.dataset.filename) {
    loadSession(historyItem.dataset.filename);
  }
});

window.addEventListener("resize", syncCanvasSize);

renderAnnotationList();
updateToolButtons();
refreshOverlay();
syncCanvasSize();
loadHistoryList();
