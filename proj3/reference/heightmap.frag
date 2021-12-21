// Fragment shader program
precision mediump int;
precision mediump float;

// The texture unit to use for the color lookup
uniform sampler2D u_Texture_unit;

// Data coming from the vertex shader
varying vec2 v_Texture_coordinate;

void main() {
  gl_FragColor = texture2D(u_Texture_unit, v_Texture_coordinate);
}


// https://csawesome.runestone.academy/runestone/books/published/learnwebgl2/11_surface_properties/09_heightmaps.html