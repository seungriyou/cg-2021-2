import * as mat4 from "./lib/gl-matrix/mat4.js"

"use strict";

const vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec4 a_color;

// A matrix to transform the positions by
uniform mat4 u_matrix;

// a varying the color to the fragment shader
out vec4 v_color;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;
  //gl_Position = a_position;

  // Pass the color to the fragment shader.
  v_color = a_color;
}
`;

const fragmentShaderSource = `#version 300 es

precision highp float;

// the varied color passed from the vertex shader
in vec4 v_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  outColor = v_color;
}
`;

function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // create GLSL shaders, upload the GLSL source, compile the shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Link the two shaders into a program
    const program = createProgram(gl, vertexShader, fragmentShader);

    // create each VAO
    const cubeVAO = createVAO(gl, program, cubePosition, cubeColor);
    const axesVAO = createVAO(gl, program, axesPosition, axesColor);
    const equatorVAO = createVAO(gl, program, equatorPosition, equatorColor);
    const meridianVAO = createVAO(gl, program, meridianPosition, meridianColor);
    const cameraVAO = createVAO(gl, program, cameraPosition, cameraColor);

    // look up uniform locations
    const matrixLocation = gl.getUniformLocation(program, "u_matrix");

    function radToDeg(r) {
        return r * 180 / Math.PI;
    }
    
    function degToRad(d) {
        return d * Math.PI / 180;
    }

    // hold the rotation with variable
    // we only manipulate "rotation" (not "translation", "scale")
    const rotation = [degToRad(0), degToRad(0), degToRad(0)];

    const fieldOfViewRadians = degToRad(30);

    drawScene();
    
    // set mouse control of ui
    set_slider_callbacks("longitude", function() { 
        const val = document.getElementById("longitude").value;
        document.getElementById("longitudeVal").innerText = val;
        rotation[1] = degToRad(val); 
        drawScene(); 
    });
    set_slider_callbacks("latitude", function() { 
        const val = document.getElementById("latitude").value;
        document.getElementById("latitudeVal").innerText = val;
        rotation[0] = degToRad(val); 
        drawScene(); 
    });

    function set_slider_callbacks(id, fn) {
        document.getElementById(id).oninput = fn;
    }

    const keyMessage = document.getElementById("keyMessage");

    // set keyboard control of ui (longitude)
    function longitudeControl(e) {
        const keyID = e.keyCode;
        let sliderVal = document.getElementById("longitude").value;
        
        switch (keyID) {
            // left arrow key
            case 37:
                keyMessage.innerText = "Left arrow is pressed.";
                if (sliderVal != 0) {
                    rotation[1] = degToRad(radToDeg(rotation[1]) - 1);
                    sliderVal--;
                    drawScene();
                    break;
                }
                break;
            // right arrow key
            case 39:
                keyMessage.innerText = "Right arrow is pressed.";
                if (sliderVal != 360) {
                    rotation[1] = degToRad(radToDeg(rotation[1]) + 1);
                    sliderVal++;
                    drawScene();
                    break;
                }
                break;
        }
        document.getElementById("longitude").value = sliderVal;
        document.getElementById("longitudeVal").innerText = sliderVal;
    }
    // set keyboard control of ui (latitude)
    function latitudeControl(e) {
        const keyID = e.keyCode;
        let sliderVal = document.getElementById("latitude").value;

        switch (keyID) {
            // up arrow key
            case 38:
                keyMessage.innerText = "Up arrow is pressed.";
                if (sliderVal != 90) {
                    rotation[0] = degToRad(radToDeg(rotation[0]) + 1);
                    sliderVal++;
                    drawScene();
                    break;
                }
                break;
            // down arrow key
            case 40:
                keyMessage.innerText = "Down arrow is pressed.";
                if (sliderVal != -90) {
                    rotation[0] = degToRad(radToDeg(rotation[0]) - 1);
                    sliderVal--;
                    drawScene();
                    break;
                }
                break;
        }
        document.getElementById("latitude").value = sliderVal;
        document.getElementById("latitudeVal").innerText = sliderVal;
    }
    addEventListener('keydown', longitudeControl);
    addEventListener('keydown', latitudeControl);
    addEventListener("keyup", function (e) {
        keyMessage.innerText = "";
    });

    // draw the scene
    function drawScene() {
        //webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        // clear the canvas
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // turn on depth testing
        gl.enable(gl.DEPTH_TEST);
        // tell webgl to cull faces
        gl.enable(gl.CULL_FACE);
        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);

        // ===== left half of canvas =====
        gl.viewport(0, 0, w/2, h);

        const P_left = mat4.create();
        const V_left = mat4.create();
        const MVP_left = mat4.create();

        // ----- equator -----
        gl.bindVertexArray(equatorVAO);
        mat4.ortho(P_left, -12,12,-12,12,0,30);
        mat4.lookAt(V_left, [10, 3, 10], [0,0,0], [0,1,0]);
        mat4.multiply(MVP_left, P_left, V_left); // P V
        gl.uniformMatrix4fv(matrixLocation, false, MVP_left);
        gl.drawArrays(gl.LINE_LOOP, 0, 24);
        gl.bindVertexArray(null);
        
        // ----- cube -----
        gl.bindVertexArray(cubeVAO);
        gl.uniformMatrix4fv(matrixLocation, false, MVP_left);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        gl.bindVertexArray(null);

        // ----- axes -----
        gl.bindVertexArray(axesVAO);
        gl.uniformMatrix4fv(matrixLocation, false, MVP_left);
        gl.drawArrays(gl.LINE_STRIP, 0, 6);
        gl.bindVertexArray(null);

        // ---- meridian ----
        gl.bindVertexArray(meridianVAO);
        mat4.rotateY(MVP_left, MVP_left, rotation[1]); // P V Ry
        gl.uniformMatrix4fv(matrixLocation, false, MVP_left);
        gl.drawArrays(gl.LINE_LOOP, 0, 24);
        gl.bindVertexArray(null);

        // ------ camera ------
        gl.bindVertexArray(cameraVAO);
        mat4.rotateX(MVP_left, MVP_left, -rotation[0]); // P V Ry Rx
        gl.uniformMatrix4fv(matrixLocation, false, MVP_left);
        gl.drawArrays(gl.LINE_STRIP, 0, 2);
        gl.bindVertexArray(null);

        // ===== right half of canvas =====
        gl.viewport(w/2, 0, w/2, h);

        const P_right = mat4.create();
        const V_right = mat4.create();
        const MVP_right = mat4.create();

        const aspect = 1; //gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 30;
        mat4.perspective(P_right, fieldOfViewRadians, aspect, zNear, zFar);

        // sol 1 - complicated way (implementing mat4.lookAt())
        /*
        let cameraMatrix = mat4.create();
        // compute position of the camera with matrix (cameraMatrix)
        mat4.rotateY(cameraMatrix, cameraMatrix, rotation[1]);
        mat4.rotateX(cameraMatrix, cameraMatrix, -rotation[0]);
        mat4.translate(cameraMatrix, cameraMatrix, [0,0,10]);
        // get cameraPosition from computed cameraMatrix
        const cameraPosition = [
            cameraMatrix[12],
            cameraMatrix[13],
            cameraMatrix[14],
        ];
        const center = [0, 0, 0];
        const up = [0, 1, 0];
        // perform like "mat4.lookAt(V, cameraPosition, center, up);"
        const zAxis = normalize(subtractVectors(cameraPosition, center));
        const xAxis = normalize(cross(up, zAxis));
        const yAxis = normalize(cross(zAxis, xAxis));
        if (!((xAxis[0] < 0.00001 && xAxis[1] < 0.00001 && xAxis[2] < 0.00001) ||
        (yAxis[0] < 0.00001 && yAxis[1] < 0.00001 && yAxis[2] < 0.00001))) {
            cameraMatrix = [
                xAxis[0], xAxis[1], xAxis[2], 0,
                yAxis[0], yAxis[1], yAxis[2], 0,
                zAxis[0], zAxis[1], zAxis[2], 0,
                cameraPosition[0],
                cameraPosition[1],
                cameraPosition[2],
                1,
            ];
        }
        // compute view matrix V by inversing cameraMatrix
        mat4.invert(V_right, cameraMatrix);
        mat4.multiply(MVP_right, P_right, V_right);
        */
        // sol 2 - simple way (fits this assignment)
        mat4.translate(V_right, V_right, [0, 0, -10]); // T
        mat4.rotateX(V_right, V_right, rotation[0]); // T Rx
        mat4.rotateY(V_right, V_right, -rotation[1]); // T Rx Ry
        mat4.multiply(MVP_right, P_right, V_right);

        // ----- axes -----
        gl.bindVertexArray(axesVAO);
        gl.uniformMatrix4fv(matrixLocation, false, MVP_right);
        gl.drawArrays(gl.LINE_STRIP, 0, 6);
        gl.bindVertexArray(null);

        // ----- cube ------
        gl.uniformMatrix4fv(matrixLocation, false, MVP_right);
        gl.bindVertexArray(cubeVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        gl.bindVertexArray(null);
    }
}

// source: https://webgl2fundamentals.org/webgl/webgl-fundamentals.html
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));  // eslint-disable-line
    gl.deleteShader(shader);
    return undefined;
}
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));  // eslint-disable-line
    gl.deleteProgram(program);
    return undefined;
}

function createVAO(gl, program, positionInfo, colorInfo) {
    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    const colorAttributeLocation = gl.getAttribLocation(program, "a_color");

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    
    // ===== position buffer =====
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positionInfo, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    // ===== color buffer =====
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colorInfo, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.vertexAttribPointer(colorAttributeLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0);

    return vao;
}

// for sol 1 (line 243-277)
// source: https://webgl2fundamentals.org/webgl/webgl-3d-camera-look-at.html
function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]];
}
function subtractVectors(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function normalize(v) {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    // check if dividing by zero
    if (length > 0.00001) {
        return [v[0] / length, v[1] / length, v[2] / length];
    } else {
        return [0, 0, 0];
    }
}

// position & color
const cubePosition = new Float32Array([                
    // front
    -1.0, -1.0,  1.0,
    1.0, -1.0,  1.0,
    1.0,  1.0,  1.0,
    -1.0, -1.0, 1.0,
    1.0, 1.0, 1.0,
    -1.0,  1.0,  1.0,
    // back
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
    1.0,  1.0, -1.0,
    -1.0, -1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, -1.0, -1.0,
    // top
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
    1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0,
    1.0, 1.0, 1.0,
    1.0,  1.0, -1.0,
    // bottom
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0,  1.0,
    -1.0, -1.0, -1.0,
    1.0, -1.0, 1.0,
    -1.0, -1.0,  1.0,
    // right
    1.0, -1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0,  1.0,  1.0,
    1.0, -1.0, -1.0,
    1.0, 1.0, 1.0,
    1.0, -1.0,  1.0,
    // left
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0, -1.0, -1.0,
    -1.0, 1.0, 1.0,
    -1.0,  1.0, -1.0,
]);

const cubeColor = new Uint8Array([
    // front (yellow)
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    // back (blue)       
    0, 0, 255,
    0, 0, 255,
    0, 0, 255,
    0, 0, 255,
    0, 0, 255,
    0, 0, 255,
    // top (magenta)
    255, 0, 255,
    255, 0, 255,
    255, 0, 255,
    255, 0, 255,
    255, 0, 255,
    255, 0, 255,
    // bottom (red) 
    255, 0, 0, 
    255, 0, 0, 
    255, 0, 0, 
    255, 0, 0, 
    255, 0, 0, 
    255, 0, 0, 
    // right (cyan)
    0, 255, 255,
    0, 255, 255,
    0, 255, 255,
    0, 255, 255,
    0, 255, 255,
    0, 255, 255,
    // left (green)
    0, 255, 0,
    0, 255, 0,
    0, 255, 0,
    0, 255, 0,
    0, 255, 0,
    0, 255, 0,
]);

function setEquatorPosition() {
    const segs = 24;
    const radius = 10;
    const vertices = [];
    for (let i = 0; i < segs; ++i) {
        const angle = i * Math.PI * 2 / segs;
        vertices.push(Math.cos(angle) * radius, 0.0, Math.sin(angle) * radius);
    }
    return new Float32Array(vertices);
}
const equatorPosition = setEquatorPosition();

const equatorColor = new Uint8Array([
    // equator (white)
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
    255, 255, 255,
]);

function setMeridianPosition() {
    const segs = 24;
    const radius = 10;
    const vertices = [];
    for (let i = 0; i < segs; ++i) {
        const angle = i * Math.PI * 2 / segs;
        vertices.push(0.0, Math.sin(angle) * radius, Math.cos(angle) * radius);
    }
    return new Float32Array(vertices);
}
const meridianPosition = setMeridianPosition();

const meridianColor = new Uint8Array([
    // meridian (yellow)
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
    255, 255, 0,
]);

const cameraPosition = new Float32Array([
    0.0, 0.0, 0.0,
    0.0, 0.0, 10.0,
]);

const cameraColor = new Uint8Array([
    // camera line (pink)
    255, 120, 255,
    255, 120, 255,
]);

const axesPosition = new Float32Array([
    // x-axis
    0.0, 0.0, 0.0,
    10.0, 0.0, 0.0,
    // y-axis
    0.0, 0.0, 0.0,
    0.0, 10.0, 0.0,
    // z-axis
    0.0, 0.0, 0.0,
    0.0, 0.0, 10.0,
]);

const axesColor = new Uint8Array([
    // x-axis (red)
    255, 0, 0,
    255, 0, 0,
    // y-axis (green)
    0, 255, 0,
    0, 255, 0,
    // z-axis (blue)
    0, 0, 255,
    0, 0, 255,
]);

main();