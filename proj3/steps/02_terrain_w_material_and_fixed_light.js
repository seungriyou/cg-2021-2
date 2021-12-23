"use strict";

import * as mat4 from "./gl-matrix/mat4.js"
import * as vec4 from "./gl-matrix/vec4.js"
import {toRadian} from "./gl-matrix/common.js"
import * as vec3 from "./gl-matrix/vec3.js"


function main()
{
    let canvas = document.getElementById('webgl');
    let gl = canvas.getContext('webgl2');
    
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.1,0.1,0.1,1);
    
    let V = mat4.create();
    let azimuth = 45;
    let elevation = 30;
    
    
    let fov = 50;
    let P = mat4.create();
    
    let axes = new Axes(gl);
    let terrain = new Terrain(gl);

    // ===== lights =====
    let light_lists = [
        // fixed light
        new Light(
            gl,
            [0.5, 2.3, 0.7, 1.0],   // position
            [0.1, 0.1, 0.1, 1.0],   // ambient
            [0.27, 0.27, 0.27, 1.0], //[0.2, 0.2, 0.2, 1.0], //[1.0, 1.0, 1.0, 1.0],   // diffuse
            [0.9, 0.9, 0.9, 1.0],//[1.0, 1.0, 1.0, 1.0],   // specular
            true
        ),
        // bullets
    ];

    // ===== materials =====
    // terrain = copper
    let terrain_mat = new Material([0.19125,0.0735,0.0225], [0.7038,0.27048,0.0828], [0.256777,0.137622,0.086014], 0.1);
    //let terrain_mat = new Material([0.24725,0.1995,	0.0745], [0.75164,0.60648,0.22648], [0.628281,0.555802,0.366065], 0.4);

    
    document.getElementsByTagName("BODY")[0].onkeydown = function(ev) {
        switch(ev.key)
        {
            case 'ArrowUp':
                if(ev.getModifierState("Shift"))	elevation += 5;
                break;
            case 'ArrowDown':
                if(ev.getModifierState("Shift"))	elevation += -5;
                break;
            case 'ArrowLeft':
                if(ev.getModifierState("Shift"))	azimuth += 5;
                break;
            case 'ArrowRight':
                if(ev.getModifierState("Shift"))	azimuth += -5;
                break;
            case 'a':
            case 'A':
                break;
            case 'z':
            case 'Z':
                break;
            case ' ':
                break;
            case '=':
            case '+':
                fov = Math.max(fov-5, 5);
                break;
            case '-':
            case '_':
                fov = Math.min(fov+5, 120);
                break;
        }
    
        let keystroke = "";
        if(ev.getModifierState("Shift"))	keystroke += "Shift + ";
        if(ev.key == ' ')   keystroke += 'SpaceBar';
        else                keystroke += ev.key;
        document.getElementById("output").innerHTML = keystroke;
    };


    let tick = function()
    {
        
        mat4.perspective(P, toRadian(fov), 1, 1, 100); 
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        transform_view(V, azimuth, elevation);
        
        axes.render(gl, V, P);
        terrain.render(gl, V, P, light_lists, terrain_mat);

        for (let i in light_lists)
        {
            light_lists[i].render(gl, V, P);
        }

        requestAnimationFrame(tick, canvas); // Request that the browser calls tick
    };
    tick();
}


function transform_view(V, azimuth, elevation)
{
    mat4.fromTranslation(V, [0, 0,-6] );
    mat4.rotate(V, V, toRadian(elevation), [1, 0, 0]);
    mat4.rotate(V, V, -toRadian(azimuth), [0, 1, 0]);
    mat4.rotate(V, V, -toRadian(90), [0, 1, 0]);
    mat4.rotate(V, V, -toRadian(90), [1, 0, 0]);
}

// ===== Axes =====
class Axes
{
    constructor(gl, length=2)
    {
        this.MVP = mat4.create();
        if(!Axes.h_prog)
            Axes.h_prog = init_shaders(gl, Axes.src_shader_vert, Axes.src_shader_frag);
        this.init_vbo(gl,length);
    }
    init_vbo(gl,l)
    {
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        const vertices = new Float32Array([
            0,0,0, 1,0,0,
            l,0,0, 1,0,0,
            0,0,0, 0,1,0,
            0,l,0, 0,1,0,
            0,0,0, 0,0,1,
            0,0,l, 0,0,1,
        ]);
        const vbo = gl.createBuffer();  
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const SZ = vertices.BYTES_PER_ELEMENT;

        gl.vertexAttribPointer(Axes.loc_aPosition, 3, gl.FLOAT, false, SZ*6, 0);
        gl.enableVertexAttribArray(Axes.loc_aPosition);

        gl.vertexAttribPointer(Axes.loc_aColor, 3, gl.FLOAT, false, SZ*6, SZ*3);
        gl.enableVertexAttribArray(Axes.loc_aColor);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    set_uniform_matrices(gl, h_prog, V, P)
    {
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, V);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
    }
    render(gl, V, P)
    {
        gl.useProgram(Axes.h_prog);
        gl.bindVertexArray(this.vao);
        this.set_uniform_matrices(gl, Axes.h_prog, V, P);
        gl.drawArrays(gl.LINES, 0, 6);
        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
}
Axes.loc_aPosition = 5;
Axes.loc_aColor = 9;

Axes.src_shader_vert = `#version 300 es
layout(location=${Axes.loc_aPosition}) in vec4 aPosition;
layout(location=${Axes.loc_aColor}) in vec4 aColor;
uniform mat4 MVP;
out vec4 vColor;
void main()
{
    gl_Position = MVP * aPosition;
    vColor = aColor;
}
`;
Axes.src_shader_frag = `#version 300 es
#ifdef GL_ES
precision mediump float;
#endif
in vec4 vColor;
out vec4 fColor;
void main()
{
    fColor = vColor;
}
`;

Axes.shader = null;

// ===== Terrain ======
class Terrain
{
    // d = 250, 200
    constructor(gl, d=200)
    {
        this.MVP = mat4.create();
        this.MV = mat4.create();
        this.N = mat4.create();
        this.M = mat4.create();

        if(!Terrain.h_prog)
            Terrain.h_prog = init_shaders(gl, Terrain.src_shader_vert, Terrain.src_shader_frag);
        this.init_texture(gl);
        this.init_vbo(gl, d);
    }
    init_vbo(gl, d)
    {
        // ===== prepare for texCoords & indices =====
        // division (grid)
        //const d = 20;
        const d_inv = 1/d;
        // number of vertices
        //this.n = d * d;

        // set arrays
        const texCoords = [];
        const indices = [];

        // texCoords
        for (let y = 0; y <= d; ++y) {
            for (let x = 0; x <= d; ++x) {
                texCoords.push(x * d_inv, y * d_inv);
            }
        }
        // indices
        const rowStride = d + 1;
        for (let y = 0; y < d; ++y) {
            const rowOff = y * rowStride;
            for (let x = 0; x < d; ++x) {
                indices.push(rowOff + x, rowOff + x + 1, rowOff + x + rowStride + 1);
            }
        }
        for (let x = 0; x < d; ++x) {
            for (let y = 0; y < d; ++y) {
                const rowOff = y * rowStride;
                indices.push(rowOff + x, rowOff + x + rowStride + 1, rowOff + x + rowStride);
            }
        }

        this.n = indices.length;

        // ====
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // texCoord buffer
        const texCoordBuffer = gl.createBuffer();
        if (!texCoordBuffer) {
            console.log('Failed to create the texCoord buffer object');
            return -1;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        // index buffer
        const indexBuffer = gl.createBuffer();
        if (!indexBuffer) {
            console.log('Failed to create the index buffer object');
            return -1;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        // attrib
        gl.vertexAttribPointer(Terrain.loc_aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Terrain.loc_aTexCoord);


        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    init_texture(gl)
    {
        // Create a texture object
        let texture = gl.createTexture();
        if (!texture) {
            console.log('Failed to create the texture object');
            return false;
        }

        // get the storage location of uSampler
        //?????

        // Flip the image's y axis 
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // Enable texture unit0
        gl.activeTexture(gl.TEXTURE0);
        // Bind the texture object to the target
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set the texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Set the texture image
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
         // Fill the texture with a 1x1 black pixel.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 255]));

        // Create the image object
        let image = new Image();
        if (!image) {
            console.log('Failed to create the image object');
            return false;
        }
        // Register the event handler to be called on loading an image
        /*
        image.addEventListener('load', function() {
            console.log('image loaded!');
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        });*/
        image.onload = function () {
            console.log('image loaded!');
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        };

        // Tell the browser to load an image
        image.src = './yorkville.jpg';

        //return true;
    }
    set_uniform_matrices(gl, h_prog, V, P)
    {
        // mat4 MV
        mat4.copy(this.MV, V);
        //mat4.multiply(this.MV, this.MV, M); -> 우리는 M을 안쓸 예정?
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MV"), false, this.MV);
        // mat4 MVP
        mat4.copy(this.MVP, P);
        //mat4.multiply(this.MVP, this.MVP, this.MV);
        mat4.multiply(this.MVP, this.MVP, V);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
        // mat4 matNormal
        mat4.invert(this.N, this.MV);
        mat4.transpose(this.N, this.N);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "matNormal"), false, this.N);
    }
    set_uniform_lights(gl, h_prog, lights, V)
    {
        let v = vec4.create();
        for(let i = 0; i < Terrain.numLights; ++i)
        {
            let light = lights[i];
            mat4.copy(this.MV, V);
            mat4.multiply(this.MV, this.MV, light.M);
            vec4.transformMat4(v, light.position, this.MV);

            gl.uniform4fv(gl.getUniformLocation(h_prog, `light[${i}].position`), v);
            gl.uniform3fv(gl.getUniformLocation(h_prog, `light[${i}].ambient`), light.ambient);
            gl.uniform3fv(gl.getUniformLocation(h_prog, `light[${i}].diffuse`), light.diffuse);
            gl.uniform3fv(gl.getUniformLocation(h_prog, `light[${i}].specular`), light.specular);
            gl.uniform1i(gl.getUniformLocation(h_prog, `light[${i}].enabled`), light.enabled);

            //vec4.transformMat4(v, light.direction, this.MV);

            //gl.uniform4fv(gl.getUniformLocation(h_prog, `light[${i}].direction`), v);
            //gl.uniform1f(gl.getUniformLocation(h_prog, `light[${i}].cutoff_angle`), Math.cos(light.cutoff_angle*Math.PI/180.0));
        }
    }
    set_uniform_material(gl, h_prog, mat)
    {
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.ambient"), mat.ambient);
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.diffuse"), mat.diffuse);
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.specular"), mat.specular);
        gl.uniform1f(gl.getUniformLocation(h_prog, "material.shininess"), mat.shininess * 128.0);
    }
    render(gl, V, P, lights, material)
    {
        gl.useProgram(Terrain.h_prog);
        gl.bindVertexArray(this.vao);
        this.set_uniform_matrices(gl, Terrain.h_prog, V, P);
        // get the storage location of uSampler
        //let loc_uSampler = gl.getUniformLocation(Terrain.h_prog, 'uSampler');
        //if (!loc_uSampler) {
        //    console.log('Failed to get the storage location of uSampler');
        //    return false;
        //}
        // Set the texture unit 0 to the sampler
        //gl.uniform1i(loc_uSampler, 0);

        if (lights)     this.set_uniform_lights(gl, Terrain.h_prog, lights, V);
        if (material)   this.set_uniform_material(gl, Terrain.h_prog, material);
        gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
}
Terrain.loc_aTexCoord = 7;
Terrain.numLights = 1;

Terrain.src_shader_vert = `#version 300 es
// an attribute is an input in to a vertex shader.
// It will receive data from a buffer
layout(location=${Terrain.loc_aTexCoord}) in vec2 aTexCoord;

// A matrix to transform the positions by
uniform mat4 MVP;
uniform mat4 MV;
uniform mat4 matNormal;
// The texture.
uniform sampler2D uSampler;

// a varying to pass the texture coordinates to the fragment shader
//out vec4 vColor;
//out vec2 vTexCoord; // to be deleted
out vec3 vNormal;
out vec4 vPosEye;

void main() {
    float l = 4.0;  // L_x = L_y = 4라고 설정
    float s = 1.5;  // S = 1.5라고 설정

    // get the height from the heightmap image
    //vec4 heightmap_color = vec4(texture(uSampler, aTexCoord));
    //float height = heightmap_color[0] * s - 0.7;
    float heightmap_color = texture(uSampler, aTexCoord).r;
    float height = heightmap_color * s - 0.7;
    
    // set the new vertex 
    float x = float(aTexCoord.s * l - l / 2.0);
    float y = float(aTexCoord.t * l - l / 2.0);
    vec3 new_vertex = vec3(x, y, height);

    // compute normal vectors (w/ central difference)
    const float delta = 0.01;   // 0.008
    const float double_delta = 2.0 * delta;

    float s0 = texture(uSampler, aTexCoord + vec2(-delta, 0.0)).r;
    float s1 = texture(uSampler, aTexCoord + vec2(delta, 0.0)).r;
    float t0 = texture(uSampler, aTexCoord + vec2(0.0, -delta)).r;
    float t1 = texture(uSampler, aTexCoord + vec2(0.0, delta)).r;

    vec3 ds = vec3(l, 0.0, (s1 - s0) / double_delta);
    vec3 dt = vec3(0.0, l, (t1 - t0) / double_delta);
    vec3 new_normal = cross(ds, dt);

    // transform the location of the vertex for the graphics pipeline.
    gl_Position = MVP * vec4(new_vertex, 1.0);

    // Pass the texcoord to the fragment shader.
    //vTexCoord = aTexCoord;

    vPosEye = MV * vec4(new_vertex, 1.0);
    //vNormal = normalize((matNormal * vec4(new_normal, 0.0)).xyz); // Phong-Phong
    vNormal = normalize(mat3(matNormal) * new_normal);  // Blinn-Phong
}`;
Terrain.src_shader_frag =`#version 300 es
#ifdef GL_ES
precision mediump float;
#endif

// Passed in from the vertex shader.
//in vec2 vTexCoord; // to be deleted
in vec3 vNormal;
in vec4 vPosEye;
// The texture.
uniform sampler2D uSampler; // to be deleted
// we need to declare an output for the fragment shader.
out vec4 fColor;
struct Material
{
    vec3    ambient;
    vec3    diffuse;
    vec3    specular;
    //vec3    emission;
    float   shininess;
};
struct Light
{
    vec4    position;
    vec3    ambient;
    vec3    diffuse;
    vec3    specular;
    bool    enabled;
};
uniform Material material;
uniform Light light[${Terrain.numLights}];

void main() {
    //fColor = texture(uSampler, vTexCoord);

    vec3 n = normalize(vNormal);
    vec3 l;
    vec3 v = normalize(-vPosEye.xyz);
    fColor = vec4(0.0);
    for (int i = 0; i < ${Terrain.numLights}; ++i)
    {
        if(light[i].enabled)
        {
            // Blinn-Phong
            
            if(light[i].position.w == 1.0)
                l = normalize((light[i].position - vPosEye).xyz);		// positional light
            else
                l = normalize((light[i].position).xyz);	// directional light
            float	l_dot_n = max(dot(l, n), 0.0);
            vec3	ambient = light[i].ambient * material.ambient;
            vec3	diffuse = light[i].diffuse * material.diffuse * l_dot_n;
            vec3	specular = vec3(0.0);
            if(l_dot_n > 0.0)
            {
                vec3	h = normalize(l + v);
                specular = light[i].specular * material.specular * pow(max(dot(h, n), 0.0), material.shininess);
            }
            fColor += vec4(ambient + diffuse + specular, 1);
            
            // Phong-Phong
            /*
            if(light[i].position.w == 1.0)
                l = normalize((light[i].position - vPosEye).xyz);
            else
                l = normalize((light[i].position).xyz);
            vec3	r = reflect(-l, n);
            float	l_dot_n = max(dot(l, n), 0.0);
            vec3	ambient = light[i].ambient * material.ambient;
            vec3	diffuse = light[i].diffuse * material.diffuse * l_dot_n;
            vec3	specular = vec3(0.0);
            if(l_dot_n > 0.0)
            {
                specular = light[i].specular * material.specular * pow(max(dot(r, v), 0.0), material.shininess);
            }
            fColor += vec4(ambient + diffuse + specular, 1);
            */
        }
    }
    fColor.w = 1.0;
}`;

Terrain.shader = null;

// ===== Light =====
class Light
{
    constructor(gl, position, ambient, diffuse, specular, enabled)//, cutoff_angle = 180, direction = [0,0,0])
	{
		this.position = vec4.clone(position);
		this.ambient = vec3.clone(ambient);
		this.diffuse = vec3.clone(diffuse);
		this.specular = vec3.clone(specular);
		this.enabled = enabled;
		this.M = mat4.create();
		this.MVP = mat4.create();
		//this.direction = vec4.clone([direction[0], direction[1], direction[2], 0.0]);
		//this.cutoff_angle = cutoff_angle;

		if(!Light.h_prog)
			Light.h_prog = init_shaders(gl, Light.src_shader_vert, Light.src_shader_frag);
	}
	set_type(positional)
	{
		if(positional)	this.position[3] = 1.0;
		else			this.position[3] = 0.0;
	}
	turn_on(enabled)
	{
		this.enabled = enabled;
	}
	render(gl, V, P)
	{
        let v = vec4.create();

		gl.useProgram(Light.h_prog);
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, V);
//		this.MVP.set(P); this.MVP.multiply(V);
		gl.uniformMatrix4fv(gl.getUniformLocation(Light.h_prog, "MVP"), false, this.MVP);
        vec4.transformMat4(v, this.position, this.M);
		gl.vertexAttrib4fv(Light.loc_aPosition, v);
//		gl.vertexAttrib4fv(Light.loc_aPosition, this.M.multiplyVector4(this.position).elements);
		if(this.enabled)	gl.vertexAttrib3f(Light.loc_aColor, 1, 1, 1);
		else				gl.vertexAttrib3f(Light.loc_aColor, .1, .1, .1);
		gl.drawArrays(gl.POINTS, 0, 1);
		gl.useProgram(null);
	}
}
Light.loc_aPosition = 3;
Light.loc_aColor = 8;

Light.src_shader_vert = `#version 300 es
layout(location=${Light.loc_aPosition}) in vec4 aPosition;
layout(location=${Light.loc_aColor}) in vec4 aColor;
uniform mat4 MVP;
out vec4 vColor;
void main()
{
    gl_Position = MVP * vec4(aPosition.xyz, 1);
    gl_PointSize = 6.0;
    vColor = aColor;
}
`;
Light.src_shader_frag = `#version 300 es
#ifdef GL_ES
precision mediump float;
#endif
in vec4 vColor;
out vec4 fColor;
void main()
{
    fColor = vColor;
}
`;

Light.shader = null;
Light.generate_uniform_names = function()
{

};

// ===== Material =====
class Material
{
    constructor(ambient, diffuse, specular, shininess)
	{
		this.ambient = vec3.clone(ambient);
		this.diffuse = vec3.clone(diffuse);
		this.specular = vec3.clone(specular);
		this.shininess = shininess;
	}
}
// ===== Shaders =====
function init_shader(gl, type, src)
{
    let h_shader = gl.createShader(type);
    if(!h_shader) return null;

    gl.shaderSource(h_shader, src);

    gl.compileShader(h_shader);

    let status = gl.getShaderParameter(h_shader, gl.COMPILE_STATUS);
    if(!status)
    {
        let err = gl.getShaderInfoLog(h_shader);
        console.log(`Failed to compile shader (${err})`);
        gl.deleteShader(h_shader);
        return null;
    }
    return h_shader;
}

function init_shaders(gl, src_vert, src_frag)
{
    
    let h_vert = init_shader(gl, gl.VERTEX_SHADER, src_vert);
    let h_frag = init_shader(gl, gl.FRAGMENT_SHADER, src_frag);
    if (!h_vert || !h_frag) return null;

    let h_prog = gl.createProgram();
    if (!h_prog) return null;

    gl.attachShader(h_prog, h_vert);
    gl.attachShader(h_prog, h_frag);

    gl.linkProgram(h_prog);

    let status = gl.getProgramParameter(h_prog, gl.LINK_STATUS);
    if(!status)
    {
        let err = gl.getProgramInfoLog(h_prog);
        console.log(`Failed to link program (${err})`);
        gl.deleteProgram(h_prog);
        gl.deleteShader(h_vert);
        gl.deleteShader(h_frag);
        return null;
    }
    return h_prog;
}



main();
