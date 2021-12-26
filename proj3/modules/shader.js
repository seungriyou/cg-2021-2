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

export function init_shaders(gl, src_vert, src_frag)
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
