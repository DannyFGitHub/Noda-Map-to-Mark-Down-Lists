import fs from 'fs';
import path from 'path';

let nodaJSONMap = JSON.parse(fs.readFileSync("nodamap.json"));

let mapTitle = nodaJSONMap.name;

//Get Nodes
let nodes = nodaJSONMap.nodes.map(function (node) {
    let nodeToReturn = {};
    nodeToReturn.text = node.properties[0].text;
    nodeToReturn.id = node.uuid;
    return nodeToReturn;
});

//Get Links
let links = nodaJSONMap.links.map(function (link) {
    let linkToReturn = {};
    linkToReturn.from = link.fromNode.Uuid;
    linkToReturn.to = link.toNode.Uuid;
    return linkToReturn;
});

// Get Connected Links Parent and Children, One-To-Many relationships
let jointLinks = links.map(function (linkFrom) {
    let linkToReturn = {};
    linkToReturn.parent = linkFrom.from;
    linkToReturn.children = links.filter(function (linkTo) {
        return linkTo.from === linkToReturn.parent;
    });
    if (linkToReturn.children.length > 1) {
        linkToReturn.children = linkToReturn.children.reduce(function (previousValue, currentValue, currentIndex, array) {
            let arrayToJoin = [];
            if (previousValue instanceof Array) {
                arrayToJoin = previousValue;
            }
            arrayToJoin.push(currentValue.to);
            return arrayToJoin;
        });
    } else if (linkToReturn.children.length === 1) {
        linkToReturn.children = [linkToReturn.children[0].to];
    }
    return linkToReturn;
});

// Filter out duplicate relationships, by only getting unique One-To-Many relationships
function uniqBy(arrayToGetUniques, key) {
    let index = [];
    return arrayToGetUniques.filter(function (item) {
        let k = key(item);
        return index.indexOf(k) >= 0 ? false : index.push(k);
    });
}
let uniqueLinks = uniqBy(jointLinks, function(item){return item.parent});

// Replace the uuids with actual nodes.
let linkedNodes = uniqueLinks.map(function(link){
    let nodeTree = {}
    nodeTree.parent = nodes.filter(node=>node.id === link.parent)[0];
    nodeTree.children = link.children.map(function(linkChildrenId){
        return nodes.filter(node=>node.id===linkChildrenId)[0];
    });
    return nodeTree;
});

//Convert the linked nodes One to Many relationship trees to markdown lists
function linkedNodesToText(linkedNodesToConvert){
    let textFileStringContent = "# " + capitaliseFirstLetter(mapTitle) + "\n\n";
    let paragraphs = linkedNodesToConvert.map(function(nodeTree){
        return "### " + capitaliseFirstLetter(nodeTree.parent.text) + "\n- " + nodeTree.children.map(child=>capitaliseFirstLetter(child.text)).join("\n- ");
    });
    textFileStringContent += paragraphs.join("\n\n");
    return textFileStringContent;
}

function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

//Write the markdown lists to file.
fs.writeFileSync("./converted.md", (linkedNodesToText(linkedNodes)));