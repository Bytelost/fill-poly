const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const colorPicker = document.getElementById("colorPicker");
const edgeColorPicker = document.getElementById("edgeColorPicker"); // New edge color picker
const finishPolygonButton = document.getElementById("finishPolygon");
const clearCanvasButton = document.getElementById("clearCanvas");
const toggleEdgesCheckbox = document.getElementById("toggleEdges"); // Checkbox for edge visibility

let polygons = [];  // List of polygons
let currentPolygon = { vertices: [], fillColor: colorPicker.value, edgeColor: edgeColorPicker.value };  // Active polygon
let selectedPolygonIndex = -1;  // Index of the selected polygon (-1 means none selected)

// Event listeners
canvas.addEventListener("click", handleClick);
finishPolygonButton.addEventListener("click", finishPolygon);
clearCanvasButton.addEventListener("click", clearCanvas);
colorPicker.addEventListener("input", updateFillColor);
edgeColorPicker.addEventListener("input", updateEdgeColor);
toggleEdgesCheckbox.addEventListener("change", redrawCanvas); // Redraw when checkbox is toggled

// Handle mouse click event for adding vertices or selecting polygons
function handleClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if user clicked inside an existing polygon
    const clickedPolygonIndex = getPolygonUnderMouse(x, y);
    if (clickedPolygonIndex !== -1) {
        // A polygon was clicked
        selectedPolygonIndex = clickedPolygonIndex;
        // Update color pickers to the selected polygon's colors
        colorPicker.value = polygons[selectedPolygonIndex].fillColor;
        edgeColorPicker.value = polygons[selectedPolygonIndex].edgeColor;
    } else {
        // No polygon was clicked, add vertex to the current polygon
        addVertex(x, y);
        selectedPolygonIndex = -1;  // Deselect any selected polygon
    }

    // Redraw the entire canvas
    redrawCanvas();
}

// Add vertex to the current polygon
function addVertex(x, y) {
    currentPolygon.vertices.push({ x, y });
    redrawCanvas();
}

// Finish the current polygon and start a new one
function finishPolygon() {
    if (currentPolygon.vertices.length > 2) {
        // Store the completed polygon
        polygons.push({ ...currentPolygon });
        
        // Fill the completed polygon
        fillPolygon(currentPolygon);
        
        // Draw the edge of the completed polygon if the checkbox is checked
        if (toggleEdgesCheckbox.checked) {
            drawPolygonOutline(currentPolygon.vertices, currentPolygon.edgeColor);
        }

        // Start a new polygon
        currentPolygon = { vertices: [], fillColor: colorPicker.value, edgeColor: edgeColorPicker.value };
    }

    redrawCanvas();
}

// Update the fill color of the current or selected polygon
function updateFillColor(event) {
    if (selectedPolygonIndex !== -1) {
        // Update the fill color of the selected polygon
        polygons[selectedPolygonIndex].fillColor = event.target.value;
    } else {
        // Update the fill color of the current polygon
        currentPolygon.fillColor = event.target.value;
    }
    redrawCanvas();
}

// Update the edge color of the current or selected polygon
function updateEdgeColor(event) {
    if (selectedPolygonIndex !== -1) {
        // Update the edge color of the selected polygon
        polygons[selectedPolygonIndex].edgeColor = event.target.value;
    } else {
        // Update the edge color of the current polygon
        currentPolygon.edgeColor = event.target.value;
    }
    redrawCanvas();
}

// Clear the canvas and reset the polygons
function clearCanvas() {
    polygons = [];
    currentPolygon = { vertices: [], fillColor: colorPicker.value, edgeColor: edgeColorPicker.value };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    selectedPolygonIndex = -1;
    redrawCanvas();
}

// Redraw the entire canvas including all previous polygons and the current one
function redrawCanvas() {
    // Clear the entire canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all polygons
    drawAllPolygons();

    // Draw the outline of the current polygon if the checkbox is checked
    if (currentPolygon.vertices.length > 1) {
        if (toggleEdgesCheckbox.checked) {
            drawPolygonOutline(currentPolygon.vertices, currentPolygon.edgeColor);
        }
    }

    // Highlight selected polygon
    if (selectedPolygonIndex !== -1) {
        highlightPolygon(polygons[selectedPolygonIndex]);
    }
}

// Draw the outline of a polygon with a specified color
function drawPolygonOutline(vertices, edgeColor) {
    if (vertices.length > 1) {
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.strokeStyle = edgeColor;  // Use the provided edge color
        ctx.stroke();
    }
}

// Draw all finished polygons
function drawAllPolygons() {
    for (let i = 0; i < polygons.length; i++) {
        const poly = polygons[i];
        fillPolygon(poly);
        // Draw the edges if the checkbox is checked
        if (toggleEdgesCheckbox.checked) {
            drawPolygonOutline(poly.vertices, poly.edgeColor);  // Use edge color from polygon
        }
    }
}

// Highlight a polygon by drawing a thicker outline
function highlightPolygon(polygon) {
    ctx.beginPath();
    ctx.moveTo(polygon.vertices[0].x, polygon.vertices[0].y);
    for (let i = 1; i < polygon.vertices.length; i++) {
        ctx.lineTo(polygon.vertices[i].x, polygon.vertices[i].y);
    }
    ctx.closePath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#FF0000";  // Highlight color
    ctx.stroke();
    ctx.lineWidth = 1;  // Reset line width
}

// Fill the polygon using a scan-line algorithm
function fillPolygon(polygon) {
    const vertices = polygon.vertices;
    const color = polygon.fillColor;  // Use the fill color

    // Find the bounds of the polygon (y_min and y_max)
    let y_min = Math.min(...vertices.map(v => v.y));
    let y_max = Math.max(...vertices.map(v => v.y));

    // Create the edge table
    const edgeTable = [];
    for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];
        if (v1.y !== v2.y) {  // Ignore horizontal edges
            const ymin = v1.y < v2.y ? v1 : v2;
            const ymax = v1.y > v2.y ? v1 : v2;
            const slopeInverse = (ymax.x - ymin.x) / (ymax.y - ymin.y);
            edgeTable.push({ ymin: ymin.y, ymax: ymax.y, x: ymin.x, slopeInverse });
        }
    }

    // Sort the edge table by ymin
    edgeTable.sort((a, b) => a.ymin - b.ymin);

    // Scan-line fill algorithm
    let activeEdgeTable = [];
    for (let y = y_min; y <= y_max; y++) {
        // Remove edges where y == ymax
        activeEdgeTable = activeEdgeTable.filter(edge => edge.ymax > y);

        // Add edges where ymin == current scanline
        for (const edge of edgeTable) {
            if (edge.ymin === y) {
                activeEdgeTable.push({ ...edge });
            }
        }

        // Sort active edges by x
        activeEdgeTable.sort((a, b) => a.x - b.x);

        // Fill between pairs of intersections
        for (let i = 0; i < activeEdgeTable.length; i += 2) {
            const startX = Math.floor(activeEdgeTable[i].x);
            const endX = Math.floor(activeEdgeTable[i + 1].x);
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.strokeStyle = color;  // Use fill color
            ctx.stroke();
        }

        // Update x for all edges in the active edge table
        for (const edge of activeEdgeTable) {
            edge.x += edge.slopeInverse;
        }
    }
}

// Check if a point is inside a polygon using the ray-casting algorithm
function getPolygonUnderMouse(x, y) {
    for (let i = 0; i < polygons.length; i++) {
        if (isPointInPolygon({ x, y }, polygons[i].vertices)) {
            return i;  // Return the index of the polygon
        }
    }
    return -1;  // No polygon was clicked
}

// Ray-casting algorithm to check if a point is inside a polygon
function isPointInPolygon(point, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
