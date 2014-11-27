

    var gl;
    var tracer = {};

    //necessary extensions
    var OES_texture_float;
    var OES_texture_float_linear;
    var OES_texture_half_float;
    var OES_texture_half_float_linear;
    var OES_standard_derivatives;

   // shader programs
    var poolProg;
    var skyProg;
    var waterProg = [];
    var heightProg;
    var causticProg;
    var normalProg;
    var simulateProg;
    var objProg;
    var objectProg;
    
    //rendering
    var framebuffer;
    var renderbuffer;
    var viewportOriginal
    var textureSize = 256;

    // matrices
    var mvMatrix = mat4.create();
    var mvMatrixStack = [];
    var pMatrix = mat4.create();
    var nmlMatrix = mat4.create();
    var eyePos;
    var radius = 4.0;
    //var azimuth = 0.5*Math.PI;
    var azimuth = 0.0;
    var elevation = 0.5;
    var fov = 45.0;
    var eye = sphericalToCartesian(radius, azimuth, elevation);
    var center = [0.0, 0.0, 0.0];
    var up = [0.0, 1.0, 0.0];
    var view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    //fps
    var numFramesToAverage = 16;
    var frameTimeHistory = [];
    var frameTimeIndex = 0;
    var totalTimeForFrames = 0;
    var then = Date.now() / 1000;

    // animating 
    var lastTime = 0;
    var xRot = 0;
    var yRot = 0;
    var zRot = 0;

    //mouse interaction
    var time = 0;
    var mouseLeftDown = false;
    var mouseRightDown = false;
    var lastMouseX = null;
    var lastMouseY = null;

    var preHit = vec3.create(0.0);
    var nxtHit = vec3.create(0.0);
    var viewportNormal = vec3.create(0.0);


    var pool = {};    //a cube without top plane
    var sky = {};    //a cube
    var water = {};   //a plane
    var quad = {};
    var sphere = {};



    function sphericalToCartesian( r, a, e ) {
        var x = r * Math.cos(e) * Math.cos(a);
        var y = r * Math.sin(e);
        var z = r * Math.cos(e) * Math.sin(a);

        return [x,y,z];
    }

    function initGL(canvas) {
        try {
            gl = canvas.getContext("experimental-webgl");
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
        } catch (e) {
        }
        if (!gl) {
            alert("Initializing WebGL failed.");
        }
    }


    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }


    function initShaders() {
     //-----------------------pool------------------------------
        poolProg = gl.createProgram();
        gl.attachShader(poolProg, getShader(gl, "pool-vs") );
        gl.attachShader( poolProg, getShader(gl, "pool-fs") );
        gl.linkProgram(poolProg);

        if (!gl.getProgramParameter(poolProg, gl.LINK_STATUS)) {
            alert("Could not initialize pool shader.");
        }
        gl.useProgram(poolProg);

        poolProg.vertexPositionAttribute = gl.getAttribLocation(poolProg, "aVertexPosition");
        poolProg.textureCoordAttribute = gl.getAttribLocation(poolProg, "aTextureCoord");
        poolProg.vertexNormalAttribute = gl.getAttribLocation(poolProg, "aVertexNormal");

        poolProg.pMatrixUniform = gl.getUniformLocation(poolProg, "uPMatrix");
        poolProg.mvMatrixUniform = gl.getUniformLocation(poolProg, "uMVMatrix");
        poolProg.NmlMatrixUniform = gl.getUniformLocation(poolProg, "uNmlMatrix");
        poolProg.samplerTileUniform = gl.getUniformLocation(poolProg, "uSamplerTile");

        //-----------------------sphere------------------------------
        objProg = gl.createProgram();
        gl.attachShader(objProg, getShader(gl, "obj-vs") );
        gl.attachShader(objProg, getShader(gl, "obj-fs") );
        gl.linkProgram(objProg);

        if (!gl.getProgramParameter(objProg, gl.LINK_STATUS)) {
            alert("Could not initialize obj shader.");
        }
        gl.useProgram(objProg);

        objProg.vertexPositionAttribute = gl.getAttribLocation(objProg, "aVertexPosition");
       // objProg.textureCoordAttribute = gl.getAttribLocation(objProg, "aTextureCoord");
        objProg.vertexNormalAttribute = gl.getAttribLocation(objProg, "aVertexNormal");

        objProg.pMatrixUniform = gl.getUniformLocation(objProg, "uPMatrix");
        objProg.mvMatrixUniform = gl.getUniformLocation(objProg, "uMVMatrix");
        objProg.NmlMatrixUniform = gl.getUniformLocation(objProg, "uNmlMatrix");
        objProg.CenterUniform = gl.getUniformLocation(objProg, "uCenter");
        //objProg.RadiusUniform = gl.getUniformLocation(objProg, "uRadius");
       // objProg.diffuseColorUniform = gl.getUniformLocation(objProg, "uDiffuseColor");
       // objProg.samplerTileUniform = gl.getUniformLocation(objProg, "uSampler");


     //-----------------------sky------------------------------
        skyProg = gl.createProgram();
        gl.attachShader(skyProg, getShader(gl, "sky-vs") );
        gl.attachShader( skyProg, getShader(gl, "sky-fs") );
        gl.linkProgram(skyProg);

        if (!gl.getProgramParameter(skyProg, gl.LINK_STATUS)) {
            alert("Could not initialize sky shader.");
        }
        gl.useProgram(skyProg);

        skyProg.vertexPositionAttribute = gl.getAttribLocation(skyProg, "aVertexPosition");

        skyProg.pMatrixUniform = gl.getUniformLocation(skyProg, "uPMatrix");
        skyProg.mvMatrixUniform = gl.getUniformLocation(skyProg, "uMVMatrix");
        skyProg.samplerSkyUniform = gl.getUniformLocation(skyProg, "uSamplerSky");

        //-----------------------water---------------------------------

        for(var i=0; i<2; i++){

            waterProg[i] = gl.createProgram();
            gl.attachShader(waterProg[i], getShader(gl, "water-vs") );
            gl.attachShader(waterProg[i], getShader(gl, "water-fs") );
            gl.linkProgram(waterProg[i]);

            if (!gl.getProgramParameter(waterProg[i], gl.LINK_STATUS)) {
                alert("Could not initialize water shader.");
            }
            gl.useProgram(waterProg[i]);

            waterProg[i].vertexPositionAttribute = gl.getAttribLocation(waterProg[i], "aVertexPosition");
            waterProg[i].vertexNormalAttribute = gl.getAttribLocation(waterProg[i], "aVertexNormal");
            //waterProg.textureCoordAttribute = gl.getAttribLocation(waterProg, "aTextureCoord");

            waterProg[i].pMatrixUniform = gl.getUniformLocation(waterProg[i], "uPMatrix");
            waterProg[i].mvMatrixUniform = gl.getUniformLocation(waterProg[i], "uMVMatrix");
            waterProg[i].samplerSkyUniform = gl.getUniformLocation(waterProg[i], "uSamplerSky");
            waterProg[i].samplerTileUniform = gl.getUniformLocation(waterProg[i], "uSamplerTile");
            waterProg[i].samplerHeightUniform = gl.getUniformLocation(waterProg[i], "uSamplerHeight");
            waterProg[i].eyePositionUniform = gl.getUniformLocation(waterProg[i],"uEyePosition");
            waterProg[i].NmlMatrixUniform = gl.getUniformLocation(waterProg[i], "uNmlMatrix");
            waterProg[i].ProgNumUniform = gl.getUniformLocation(waterProg[i], "uProgNum");

        }

        //-----------------------height------------------------------------------------
        heightProg = gl.createProgram();
        gl.attachShader(heightProg, getShader(gl, "interact-vs") );
        gl.attachShader(heightProg, getShader(gl, "interact-height-fs") );
        gl.linkProgram(heightProg);

        if (!gl.getProgramParameter(heightProg, gl.LINK_STATUS)) {
            alert("Could not initialize height shader.");
        }
        gl.useProgram(heightProg);

        heightProg.vertexPositionAttribute = gl.getAttribLocation(heightProg, "aVertexPosition");
        heightProg.samplerFloatUniform = gl.getUniformLocation(heightProg, "uSamplerFloat");
        heightProg.centerUniform = gl.getUniformLocation(heightProg,"uCenter");

        //-----------------------caustic------------------------------------------------
        causticProg = gl.createProgram();
        gl.attachShader(causticProg, getShader(gl, "caustic-vs") );
        gl.attachShader(causticProg, getShader(gl, "caustic-fs") );
        gl.linkProgram(causticProg);

        if (!gl.getProgramParameter(causticProg, gl.LINK_STATUS)) {
            alert("Could not initialize caustic shader.");
        }
        //gl.useProgram(causticProg);
        //causticProg.samplerHeightUniform = gl.getUniformLocation(causticProg, "uSamplerHeight");
        //causticProg.vertexPositionAttribute = gl.getAttribLocation(causticProg, "aVertexPosition");


         //-----------------------normal------------------------------------------------
        normalProg = gl.createProgram();
        gl.attachShader(normalProg, getShader(gl, "interact-vs") );
        gl.attachShader(normalProg, getShader(gl, "interact-normal-fs") );
        gl.linkProgram(normalProg);

        if (!gl.getProgramParameter(normalProg, gl.LINK_STATUS)) {
            alert("Could not initialize normal shader.");
        }
        gl.useProgram(normalProg);

        normalProg.vertexPositionAttribute = gl.getAttribLocation(normalProg, "aVertexPosition");
        normalProg.samplerFloatUniform = gl.getUniformLocation(normalProg, "uSamplerFloat");
        normalProg.deltaUniform = gl.getUniformLocation(normalProg,"uDelta");

        //-----------------------simulation-----------------------------------------------
        simulateProg = gl.createProgram();
        gl.attachShader(simulateProg, getShader(gl, "interact-vs") );
        gl.attachShader(simulateProg, getShader(gl, "interact-simulate-fs") );
        gl.linkProgram(simulateProg);


        if (!gl.getProgramParameter(simulateProg, gl.LINK_STATUS)) {
            alert("Could not initialize simulate shader.");
        }
        gl.useProgram(simulateProg);

        simulateProg.vertexPositionAttribute = gl.getAttribLocation(simulateProg, "aVertexPosition");
        simulateProg.samplerFloatUniform = gl.getUniformLocation(simulateProg, "uSamplerFloat");
        simulateProg.deltaUniform = gl.getUniformLocation(simulateProg,"uDelta");

        //---------------------sphere interaction---------------------------------------------------
        objectProg = gl.createProgram();
        gl.attachShader(objectProg, getShader(gl, "interact-vs") );
        gl.attachShader(objectProg, getShader(gl, "interact-sphere-fs") );
        gl.linkProgram(objectProg);


        if (!gl.getProgramParameter(objectProg, gl.LINK_STATUS)) {
            alert("Could not initialize interact shader.");
        }
        gl.useProgram(objectProg);

        objectProg.vertexPositionAttribute = gl.getAttribLocation(objectProg, "aVertexPosition");
        objectProg.samplerFloatUniform = gl.getUniformLocation(objectProg, "uSamplerFloat");
        objectProg.newCenterUniform = gl.getUniformLocation(objectProg, "uNewCenter");
        objectProg.oldCenterUniform = gl.getUniformLocation(objectProg,"uOldCenter");
        objectProg.radiusUniform = gl.getUniformLocation(objectProg,"uRadius");
    }

    function checkCanDrawToTexture(texture){
        framebuffer = framebuffer || gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        var result = gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return result;

    }

    function handleLoadedTexture(texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        //gl.generateMipmap(gl.TEXTURE_2D);
       // gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function initTexture(texture, url) {
        console.log("loading texture: " + url);
        texture.image = new Image();
        texture.image.onload = function () {
            handleLoadedTexture(texture)
        }

        texture.image.src = url;
    }

    function initFloatTexture( texture, format, filter, type, width, height ){ 
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

        if(OES_texture_float && type == gl.FLOAT){
            gl.texImage2D( gl.TEXTURE_2D, 0, format, width, height, 0, format, type, null);
          }
          else{
            alert("OES_texture_float is not enabled.");
          }
       // gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function initSkyBoxTexture() {
        var ct = 0;
        var img = new Array(6);
        var urls = [
       // "skybox/posx.jpg", "skybox/negx.jpg", 
        //   "skybox/posy.jpg", "skybox/negy.jpg", 
        //   "skybox/posz.jpg", "skybox/negz.jpg"
       // "skybox/Sky2.jpg","skybox/Sky3.jpg",
      // "skybox/Sky4.jpg","skybox/Sky5.jpg", 
      //  "skybox/Sky0.jpg","skybox/Sky1.jpg"
        "skybox/skyright.jpg","skybox/skyleft.jpg",
       "skybox/skyup.jpg","skybox/skydown.jpg", 
        "skybox/skyback.jpg","skybox/skyfront.jpg"
        ];
        for (var i = 0; i < 6; i++) {
            img[i] = new Image();
            img[i].onload = function() {
                ct++;
                if (ct == 6) {   //upon finish loading all 6 images
                    sky.Texture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, sky.Texture);
                    var targets = [
                       gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
                       gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
                       gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z ];
                    for (var j = 0; j < 6; j++) {
                      //  console.log("bingding skybox texture: " + targets[j]);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                        gl.texImage2D(targets[j], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img[j]);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    }
                    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                  
                }
            }
           // console.log("loading skybox texture: " + urls[i]);
            img[i].src = urls[i];
        }
    }
  
    function mvPushMatrix() {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);
        mvMatrixStack.push(copy);
    }

    function mvPopMatrix() {
        if (mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        mvMatrix = mvMatrixStack.pop();
    }


    function setMatrixUniforms(prog) {
        gl.uniformMatrix4fv(prog.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(prog.mvMatrixUniform, false, mvMatrix);
    }


    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }



function initBuffers(model, primitive){
        model.VBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.VBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(primitive.vertices), gl.STATIC_DRAW);

        model.NBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.NBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(primitive.normals), gl.STATIC_DRAW);

        model.TBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.TBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(primitive.texcoords), gl.STATIC_DRAW);
     
        model.IBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.IBO);
       
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(primitive.indices), gl.STATIC_DRAW);
        model.IBO.numItems = primitive.numIndices;
}

   



    function handleMouseDown(event) {
        if( event.button == 2 ) {
            mouseLeftDown = false;
            mouseRightDown = true;
        }
        else {
            mouseLeftDown = true;
            mouseRightDown = false;
            startInteraction(event.clientX, event.clientY);
        }
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    function handleMouseUp(event) {
        mouseLeftDown = false;
        mouseRightDown = false;
    }

    function handleMouseMove(event) {
        if (!(mouseLeftDown || mouseRightDown)) {
            return;
        }
        var newX = event.clientX;
        var newY = event.clientY;

        var deltaX = newX - lastMouseX;
        var deltaY = newY - lastMouseY;
        
        if( mouseLeftDown ) {
            duringInterction(newX, newY);
            //radius += 0.01 * deltaY;
            //radius = Math.min(Math.max(radius, 2.0), 10.0);
        }
        else {
            azimuth += 0.01 * deltaX;
            elevation += 0.01 * deltaY;
            elevation = Math.min(Math.max(elevation, -Math.PI/2+0.001), Math.PI/2-0.001);
        }
        eye = sphericalToCartesian(radius, azimuth, elevation);
        view = mat4.create();
        mat4.lookAt(eye, center, up, view);

        lastMouseX = newX;
        lastMouseY = newY;
    }

    function handleMouseWheel(event){
            //console.log("scroll");
        var move = event.wheelDelta/240;
        
        if (move < 0 || pMatrix[14] > -2){
          //  pMatrix = mat4.translate(pMatrix, [0, 0, event.wheelDelta/240]);
        }
        if(fov+move< 90 && fov+move> 25){
            fov += move;
        }
        return false; // Don't scroll the page 
    }

    function startInteraction(x,y){
        initTracer();
        var ray = vec3.create();
        ray = rayEyeToPixel(x,y);

        var hit = rayIntersectSphere(tracer.eye, ray, sphere.center, sphere.radius);
        if(hit!= null){   //sphere interaction
            preHit = hit.point;
            console.log("hit sphere at " + vec3.str(preHit));
            viewportNormal = rayEyeToPixel(gl.viewportWidth / 2.0, gl.viewportHeight / 2.0);
        }
        else{   //mouse directioin interaction
            var scale = -tracer.eye[1] / ray[1];
            //move in the direction of ray, until gets the 'y=waterHeight' plane
            var point = vec3.create([tracer.eye[0] + ray[0]*scale, tracer.eye[1] + ray[1]*scale, tracer.eye[2] + ray[2]*scale] );
       
          //  var pointOnPlane = tracer.eye.add(ray.multiply(-tracer.eye.y / ray.y));
           //  console.log("tracer.eye= " + vec3.str(tracer.eye)+"\nray= " + vec3.str(ray)+"\npoint= " +vec3.str(point));
            if (Math.abs(point[0]) < 1 && Math.abs(point[2]) < 1) {
              //console.log("water plane hit at "+ point[0].toFixed(2)+ "," + point[2].toFixed(2));
             // alert("water plane hit at "+ point[0].toFixed(2)+ "," + point[2].toFixed(2));
              drawHeight(point[0],point[2]);
            }
        }
    }

    function duringInterction(x,y){

        var ray = vec3.create();
        ray = rayEyeToPixel(x,y);

        var hit = rayIntersectSphere(tracer.eye, ray, sphere.center, sphere.radius);
        if(hit!= null){   //sphere interaction, move sphere around
            var theEye = vec3.create(tracer.eye);
            var preRay = vec3.create(theEye);
            var nxtRay = vec3.create(ray);

            vec3.subtract(preRay, preHit);
            var t1 = vec3.dot(viewportNormal, preRay);  
            var t2 = vec3.dot(viewportNormal, nxtRay);
            var t = -t1/t2;
            vec3.scale(nxtRay, t)
        
            vec3.add(theEye, nxtRay, nxtHit);
            var offsetHit = vec3.create(nxtHit);
            vec3.subtract(offsetHit, preHit);
          

        
            if(vec3.length(offsetHit)>0.0000001){
                console.log("pre ray: " + vec3.str(preRay));
                console.log("nxt ray: " + vec3.str(nxtRay));

                console.log("pre hit: " + vec3.str(preHit));
                console.log("nxt hit: " + vec3.str(nxtHit));
                 console.log("hit offset: " + vec3.str(offsetHit));
                //sphere.center[1] += 0.01; 
                sphere.center = vec3.add(sphere.center, offsetHit);
                // sphere.center[0] = Math.max(sphere.radius - 1, Math.min(1 - sphere.radius, sphere.center[0]));
                // sphere.center[1] = Math.max(sphere.radius - 1, Math.min(10, sphere.center[1]));
                // sphere.center[2] = Math.max(sphere.radius- 1, Math.min(1 - sphere.radius, sphere.center[0]));
                preHit = nxtHit;
                console.log("moving to new center: " + vec3.str(sphere.center));
            }
        }
        else{   //direction mouse interaction
            var scale = -tracer.eye[1] / ray[1];
            var point = vec3.create([tracer.eye[0] + ray[0]*scale, tracer.eye[1] + ray[1]*scale, tracer.eye[2] + ray[2]*scale] );
       
            if (Math.abs(point[0]) < 1 && Math.abs(point[2]) < 1) {
              drawHeight(point[0],point[2]);
            }
        }

    }

    function drawScene() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

        mat4.identity(mvMatrix);
        mat4.multiply(mvMatrix,view);

      /*  mat4.translate(mvMatrix, [0.0, 0.0, -4.0]);
        mat4.rotate(mvMatrix, degToRad(xRot), [1, 0, 0]);
        mat4.rotate(mvMatrix, degToRad(yRot), [0, 1, 0]);
        mat4.rotate(mvMatrix, degToRad(zRot), [0, 0, 1]);*/

        /*var xAxis = vec3.create( [mvMatrix[0], mvMatrix[4], mvMatrix[8]] );
        var yAxis = vec3.create( [mvMatrix[1], mvMatrix[5], mvMatrix[9]] );
        var zAxis = vec3.create( [mvMatrix[2], mvMatrix[6], mvMatrix[10]] );
        var offset = vec3.create( [mvMatrix[3], mvMatrix[7], mvMatrix[11]] );
        var xNew = vec3.dot(vec3.negate(offset),xAxis);
        var yNew = vec3.dot(vec3.negate(offset),yAxis);
        var zNew = vec3.dot(vec3.negate(offset),zAxis);
        //console.log("offset: "+ vec3.str(vec3.negate(offset)));
        console.log("axis: "+ vec3.str(xAxis)+"," +vec3.str(yAxis)+","+vec3.str(zAxis) );
        //console.log("eye pos calculation: "+ xNew+"," +yNew+","+zNew );
        eyePos = vec3.create([xNew,yNew,zNew]);
        console.log("eyePos = " + vec3.str(eyePos) +"           eye = " + eye);*/
        

        mat4.inverse(mvMatrix,nmlMatrix);
        mat4.transpose(nmlMatrix,nmlMatrix);


        drawPool();
        drawSkyBox();
        drawObj(sphere);
        drawWater();
    }

    function drawPool(){
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(poolProg);

        gl.enable(gl.CULL_FACE);
        gl.frontFace(gl.CCW);   //define front face
        gl.cullFace(gl.FRONT);   //cull front facing faces

        gl.bindBuffer(gl.ARRAY_BUFFER, pool.VBO);
        gl.vertexAttribPointer(poolProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(poolProg.vertexPositionAttribute);

         gl.bindBuffer(gl.ARRAY_BUFFER, pool.NBO);
        gl.vertexAttribPointer(poolProg.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(poolProg.vertexNormalAttribute);

        gl.bindBuffer(gl.ARRAY_BUFFER, pool.TBO);
        gl.vertexAttribPointer(poolProg.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(poolProg.textureCoordAttribute);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pool.Texture);
        gl.uniform1i(poolProg.samplerTileUniform, 0);

        setMatrixUniforms(poolProg);
         gl.uniformMatrix4fv(poolProg.NmlMatrixUniform, false, nmlMatrix);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pool.IBO);
        gl.drawElements(gl.TRIANGLES, pool.IBO.numItems, gl.UNSIGNED_SHORT, 0);

        gl.disable(gl.CULL_FACE);
        gl.disableVertexAttribArray(poolProg.vertexPositionAttribute);
        gl.disableVertexAttribArray(poolProg.textureCoordAttribute);
        gl.disableVertexAttribArray(poolProg.vertexNormalAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function drawSkyBox() {

    if (sky.Texture){
       // console.log("drawing sky box", sky.IBO.numItems);
      
     //gl.enable(gl.DEPTH_TEST);
        gl.useProgram(skyProg);
      

        gl.bindBuffer(gl.ARRAY_BUFFER, sky.VBO);
        gl.vertexAttribPointer(skyProg.vertexPositionAttribute , 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(skyProg.vertexPositionAttribute );

        setMatrixUniforms(skyProg);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, sky.Texture);
        gl.uniform1i(skyProg.samplerSkyUniform, 1);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sky.IBO);
        gl.drawElements(gl.TRIANGLES, sky.IBO.numItems, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(skyProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
}


function drawObj(model){

        gl.useProgram(objProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.VBO);
        gl.vertexAttribPointer(objProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(objProg.vertexPositionAttribute);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.NBO);
        gl.vertexAttribPointer(objProg.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(objProg.vertexNormalAttribute);

        setMatrixUniforms(objProg);
      // console.log("center is "+ vec3.str(model.center));
       //console.log("radius is " + model.radius);
        gl.uniform3fv(objProg.CenterUniform, model.center);
        //gl.uniform1f(objProg.RadiusUniform, model.radius);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.IBO);
        gl.drawElements(gl.TRIANGLES, model.IBO.numItems, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(objProg.vertexPositionAttribute);
        gl.disableVertexAttribArray(objProg.vertexNormalAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}


function drawWater(){

        gl.enable(gl.CULL_FACE);
        for(var i=0 ;i<1; i++){
              
            gl.cullFace(i ? gl.BACK : gl.FRONT);

            gl.useProgram(waterProg[i]);
            gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
            gl.vertexAttribPointer(waterProg[i].vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(waterProg[i].vertexPositionAttribute);

            gl.bindBuffer(gl.ARRAY_BUFFER, water.NBO);
            gl.vertexAttribPointer(waterProg[i].vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(waterProg[i].vertexNormalAttribute);

            setMatrixUniforms(waterProg[i]);
            gl.uniformMatrix4fv(waterProg[i].NmlMatrixUniform, false, nmlMatrix);
            gl.uniform1i(waterProg[i].ProgNumUniform, i);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, sky.Texture);
            gl.uniform1i(waterProg[i].samplerSkyUniform, 1);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, pool.Texture);
            gl.uniform1i(waterProg[i].samplerTileUniform,0);

    
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
            gl.uniform1i(waterProg[i].samplerHeightUniform,2);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
            gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);

            gl.uniform3fv(waterProg[i].eyePositionUniform, eye);


            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null); 
       
        }
        gl.disable(gl.CULL_FACE);
      
}

function drawHeight(x,y){   //TextureA as input, TextureB as output

        x = x || 0;
        y = y || 0;
        
        console.log("water plane hit at "+ x.toFixed(2)+ "," + y.toFixed(2));
        
        initFrameBuffer();
        //resize viewport
        gl.viewport(0, 0, textureSize, textureSize);

        //-------------------start rendering to texture--------------------------------------
        gl.useProgram(heightProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(heightProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(heightProg.vertexPositionAttribute);

      //  setMatrixUniforms(heightProg);
        gl.uniform2f(heightProg.centerUniform, x, y);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(heightProg.samplerFloatUniform,0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
        gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);
     

        //-------------- after rendering---------------------------------------------------
        gl.disableVertexAttribArray(heightProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // reset viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        //swap TextureA  & TextureB 
        var tmp = water.TextureA;
        water.TextureA = water.TextureB;
        water.TextureB = tmp;

}


function drawCaustic(){
        //resize viewport
        initFrameBuffer();
        
        gl.viewport(0, 0, textureSize, textureSize);
        gl.useProgram(causticProg);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(causticProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(causticProg.vertexPositionAttribute);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(causticProg.samplerHeightUniform,0);
        
        gl.disableVertexAttribArray(causticProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        

        // reset viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}

function drawNormal(){
        initFrameBuffer();
        //resize viewport
        gl.viewport(0, 0, textureSize, textureSize);

        //-------------------start rendering to texture--------------------------------------
        gl.useProgram(normalProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(normalProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(normalProg.vertexPositionAttribute);

        gl.uniform2f(normalProg.deltaUniform, 1/textureSize, 1/textureSize);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(normalProg.samplerFloatUniform,0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
        gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);

        //-------------- after rendering---------------------------------------------------
        gl.disableVertexAttribArray(normalProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // reset viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        //swap TextureA  & TextureB 
        var tmp = water.TextureA;
        water.TextureA = water.TextureB;
        water.TextureB = tmp;

}

function drawSimulation(){

        initFrameBuffer();
        //resize viewport
        gl.viewport(0, 0, textureSize, textureSize);

        //-------------------start rendering to texture--------------------------------------
        gl.useProgram(simulateProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(simulateProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(simulateProg.vertexPositionAttribute);

        gl.uniform2f(simulateProg.deltaUniform, 1/textureSize, 1/textureSize);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(simulateProg.samplerFloatUniform,0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
        gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);

        //-------------- after rendering---------------------------------------------------
        gl.disableVertexAttribArray(simulateProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // reset viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        //swap TextureA  & TextureB 
        var tmp = water.TextureA;
        water.TextureA = water.TextureB;
        water.TextureB = tmp;


}

function drawInteraction(){

}

function initFrameBuffer(){   // rendering to a texture, TextureB
    framebuffer = framebuffer || gl.createFramebuffer();
    renderbuffer = renderbuffer || gl.createRenderbuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

    framebuffer.width = textureSize;
    framebuffer.height = textureSize;

    if (textureSize!= renderbuffer.width ||textureSize!= renderbuffer.height) {
      renderbuffer.width =textureSize;
      renderbuffer.height = textureSize;
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, textureSize, textureSize);
    }
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, water.TextureB, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
      alert("Rendering to this texture is not supported");
    }

}

function initTracer(){
 // tracer.eye = vec3.create(eyePos);
 tracer.eye = vec3.create(eye);

  var v = gl.getParameter(gl.VIEWPORT);   //{0,0,canvas.width,canvas.height}
  //var m = gl.modelviewMatrix.m;
  var point00 = vec3.create( [v[0], v[1], 1] );  // {x,y,depth}
  var point10 = vec3.create( [v[0]+v[2], v[1], 1] );
  var point01 = vec3.create( [v[0], v[1]+v[3], 1] ); 
  var point11 = vec3.create( [v[0]+v[2], v[1]+v[3], 1]);   
  //console.log("viewport data: " +v[0] + "," + v[1] + "," + v[2] + "," + v[3]);
  //console.log("point data: " + vec3.str(point00) + "," +  vec3.str(point10) + "," + vec3.str(point01) + "," + vec3.str(point11));

  tracer.ray00 = vec3.unproject(point00, mvMatrix, pMatrix, v);
  vec3.subtract(tracer.ray00, tracer.eye, tracer.ray00);

  tracer.ray10 = vec3.unproject(point10, mvMatrix, pMatrix, v);
  vec3.subtract(tracer.ray10, tracer.eye, tracer.ray10);

  tracer.ray01 = vec3.unproject(point01, mvMatrix, pMatrix, v);
  vec3.subtract(tracer.ray01, tracer.eye, tracer.ray01);

 tracer.ray11 = vec3.unproject(point11, mvMatrix, pMatrix, v);
  vec3.subtract(tracer.ray11, tracer.eye, tracer.ray11);

 //console.log("initial tracer: \n" + vec3.str(tracer.ray00) + "\n" +  vec3.str(tracer.ray10) + "\n" + vec3.str(tracer.ray01) + "\n" + vec3.str(tracer.ray11));
  tracer.viewport = v;
}

function rayEyeToPixel(h,v){   //shoots ray from eye to a pixel, returns unit ray direction
    var ray = vec3.create();

    var x = (h - tracer.viewport[0]) / tracer.viewport[2];
    var y = 1.0 - (v - tracer.viewport[1]) / tracer.viewport[3];

    //console.log("coord is: "+x+","+y);
    var rayY0 = vec3.create();
    vec3.lerp(tracer.ray00, tracer.ray10, x, rayY0);

    var rayY1 = vec3.create();
    vec3.lerp(tracer.ray01, tracer.ray11, x, rayY1);

    vec3.lerp(rayY0, rayY1, y, ray);
    vec3.normalize(ray,ray);
   // console.log("the ray passing the pixel is " + vec3.str(ray));
    return ray;

}

function rayIntersectSphere(origin, ray, center, radius){ // ray sphere intersection
  var offset = vec3.create();
  var newRay = vec3.create(ray);
  var newCenter = vec3.create(center);
  var newOrigin = vec3.create(origin);
  vec3.subtract(newOrigin, newCenter, offset);
  var a = vec3.dot(newRay, newRay);
  var b = 2.0 * vec3.dot(newRay, offset);
  var c = vec3.dot(offset, offset)- radius * radius;
  var discriminant = b * b - 4 * a * c;
//console.log("origin: " + vec3.str(origin) + "\nray: "+vec3.str(ray) + "\ncenter" + vec3.str(center)+"\nradius"+vec3.str(radius));
//console.log("a: " + a + "\nb: "+b + "\nc" + c+"\ndiscriminant"+discriminant);
  if (discriminant > 0) {
    var hit = {};
    hit.t = (-b - Math.sqrt(discriminant)) / (2 * a);
    hit.point = vec3.create();
    hit.point =  vec3.add(newOrigin, vec3.scale(newRay, hit.t));
    hit.normal =  vec3.create();
    hit.normal = vec3.subtract(hit.point, newCenter);
    hit.normal = vec3.scale(hit.normal, 1.0/radius);
    return hit;
  }
  return null;
}

    function animate() {
        var timeNow = new Date().getTime();
        if (lastTime != 0) {
            var elapsed = timeNow - lastTime;

          //  xRot += (90 * elapsed) / 1000.0;
           // yRot += (90 * elapsed) / 1000.0;
           //zRot += (90 * elapsed) / 1000.0;
        }
        lastTime = timeNow;

        drawNormal();
        drawSimulation();
        drawSimulation();
       // drawInteraction();
    }


    function tick() {
        var now = Date.now() / 1000;  
        var elapsedTime = now - then;
        then = now;

        // update the frame history.
        totalTimeForFrames += elapsedTime - (frameTimeHistory[frameTimeIndex] || 0);
        frameTimeHistory[frameTimeIndex] = elapsedTime;
        frameTimeIndex = (frameTimeIndex + 1) % numFramesToAverage;

        // compute fps
        var averageElapsedTime = totalTimeForFrames / numFramesToAverage;
        var fps = 1 / averageElapsedTime;
        document.getElementById("fps").innerText = fps.toFixed(0); 
        //$('#fps').html(fps.toFixed(0));
    

        requestAnimFrame(tick);
        drawScene();
     
        animate();
    }


    function webGLStart() {
        var canvas = document.getElementById("the-canvas");
        initGL(canvas);

        canvas.onmousedown = handleMouseDown;
        canvas.oncontextmenu = function(ev) {return false;};
        canvas.onmousewheel   = handleMouseWheel;
        document.onmouseup = handleMouseUp;
        document.onmousemove = handleMouseMove;

        //enable necessry extensions.
        OES_texture_float_linear = gl.getExtension("OES_texture_float_linear");
        OES_texture_float = gl.getExtension("OES_texture_float");
        OES_texture_half_float  = gl.getExtension("OES_texture_half_float");
        OES_texture_half_float_linear = gl.getExtension("OES_texture_half_float_linear");
        OES_standard_derivatives = gl.getExtension("OES_standard_derivatives");
        console.log(OES_standard_derivatives);


        initShaders();
      //  initBuffers();
      initBuffers(sky, cubeSky);
      initBuffers(pool, cubePool);
      initBuffers(sphere, sphereObj);
      initBuffers(water, planeWater);
      sphere.center = vec3.create(0.0,0.0,0.0);
      sphere.radius = sphereObj.radius;
     // console.log("sphere radius: "+sphere.radius);

       // initTexture();
       pool.Texture = gl.createTexture();
       initTexture(pool.Texture, "tile/tile.png");
       //initTexture(pool.Texture, "tile/tile2.jpg");
       water.TextureA = gl.createTexture();
      water.TextureB = gl.createTexture();
      water.TextureC = gl.createTexture();
      water.TextureD = gl.createTexture();

      var filter = OES_texture_float_linear? gl.LINEAR : gl.NEAREST;
      initFloatTexture(water.TextureA, gl.RGBA, filter, gl.FLOAT, textureSize, textureSize);
      initFloatTexture(water.TextureB, gl.RGBA, filter, gl.FLOAT, textureSize, textureSize);

      var successA = checkCanDrawToTexture(water.TextureA);
      var successB = checkCanDrawToTexture(water.TextureB);

     /* if ((!successA || !successB) && OES_texture_half_float) {
        console.log("switch to half float");
        filter = OES_texture_half_float_linear ? gl.LINEAR : gl.NEAREST;
        initFloatTexture(water.TextureA, gl.RGB, filter, gl.HALF_FLOAT_OES, textureSize, textureSize );
        initFloatTexture(water.TextureB, gl.RGB, filter, gl.HALF_FLOAT_OES, textureSize, textureSize);
      }*/

       initSkyBoxTexture(); 
   
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        tick();
    }


