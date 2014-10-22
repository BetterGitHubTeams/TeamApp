
function GitHub() {

    this.client_id = '698b2e42ce01c44a3de2';
    this.client_secret = 'a3ba7f3fcdd7023f59f32000b13b0289b3a69cf3';

    this.code = null;

    function get(callback) {
        callback(true);
    }
}

module.exports = new GitHub();