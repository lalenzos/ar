var testVariable = "Hallo"; // "var" is hidden
testVariable = "";

let anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames;
anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames = "Ciao";

function test(a, b, ...c) {}
test('Foo', 'bar', 1, 2, 3, 4) //inline hints (parameters)

console.log('a', 'b', 'c', 'd', 'e')

console.log(anotherVariableThatHasAnExtremelyLongVariableNameForTestingOfEdgeCasesSinceWeAlsoLikeToConsiderLongVariableNames)
