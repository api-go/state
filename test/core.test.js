// test/core.test.js
window.testCore = async function() {
    const { Cookie, _runCode, _returnCode } = ApigoState;
    console.log('Testing core.js...');
    const vars = { a: 1, b: 2 };
    const extendVars = { c: 3 };
    
    // _runCode
    if (_runCode('return a + b + c', vars, {}, extendVars) !== 6) throw new Error('_runCode failed');
    
    // _returnCode
    if (_returnCode('a + b', vars, {}) !== 3) throw new Error('_returnCode simple failed');
    if (_returnCode('${a} + ${b}', vars, {}) !== '1 + 2') throw new Error('_returnCode template failed');

    Cookie.stateCookieTest = 'works';
    if (Cookie.stateCookieTest !== 'works') throw new Error('Cookie state read/write failed');
    Cookie.stateCookieTest = undefined;
    if (Cookie.stateCookieTest !== undefined) throw new Error('Cookie state removal failed');
    if (!Cookie.language) throw new Error('Cookie.language default was not initialized');
    
    console.log('core.js tests passed');
    return true;
}
