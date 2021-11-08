"use strict";
var testVariable = "Hallo";
testVariable = "";

const anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2 = "Ciao";
function method456(a, b, ...c) {
    console.log(a, b, ...c);
};

const method123 = (x) => {
    console.log(x);
};
method456('Foo', 'bar', 1, 2, 3, 4);
console.log('a', 'b', 'c', 'd', 'e');
console.log(anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames2);

method123("hallo");

//# sourceMappingURL=example.js.map