"use strict";
var testVariable = "Hallo";
testVariable = "";
const anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2 = "Ciao";
function test123(a, b, ...c) {
    console.log(a, b, ...c);
}
;
const test456 = (x) => {
    console.log(x);
};
test123('Foo', 'bar', 1, 2, 3, 4);
console.log('a', 'b', 'c', 'd', 'e');
console.log(anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2);
//# sourceMappingURL=example.js.map
