"use strict";
var testVariable = "Hallo";
testVariable = "";
const anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2 = "Ciao";
function test_123(a, b, ...c) {
    console.log(a, b, ...c);
}
;
const TestAbc456 = (x) => {
    console.log(x);
};
test_123('Foo', 'bar', 1, 2, 3, 4);
console.log('a', 'b', 'c', 'd', 'e');
console.log(anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2);
//# sourceMappingURL=example.js.map