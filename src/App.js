import React, { Component, useEffect, useState } from "react";
import {
  Layout,
  Row,
  Col,
  Space,
  Table,
  Skeleton,
  Button,
  Breadcrumb,
  Card,
  Rate,
  Input,
  Form,
  message,
  Menu,
  Tag,
  Popover,
  List,
  Tooltip,
} from "antd";
import "./App.less";
import ReactMarkdown from "react-markdown";
import {
  HashRouter,
  Route,
  useHistory,
  Link,
  useLocation,
} from "react-router-dom";
import { DeleteOutlined } from "@ant-design/icons";
import { useQueryParam, StringParam } from "use-query-params";
import Cookies from "universal-cookie";
import TimeDiff from "js-time-diff";

const { Header, Footer, Content } = Layout;
const { Column } = Table;

const allAttributes = ["enthusiasm", "skill", "relevance", "overall"];
const stageToColor = {
  unprocessed: "blue",
  "invite-sent": "cyan",
  scheduled: "purple",
  "pending-evaluation": "geekblue",
  "considering-rejecting": "volcano",
  rejected: "red",
  "considering-accepting": "lime",
  accepted: "green",
};

const stages = [
  "considering-accepting",
  "considering-rejecting",
  "invite-sent",
  "scheduled",
  "pending-evaluation",
  "unprocessed",

  "rejected",
  "accepted",
];

const cookies = new Cookies();
const backendUrl = process.env.REACT_APP_BACKEND_URL;

/**
 * In: {'foo': 'A', 'bar:one': 'B', 'bar:two': 'C'}
 * Out: {'foo': 'A', 'bar': {'one': 'B', 'two', 'C'}}
 */
function unflattenObject(obj) {
  const out = {};
  for (let [key, value] of Object.entries(obj)) {
    let target = out;
    while (key.includes(":")) {
      const [index, newKey] = key.split(/:(.+)/);
      target = target[index] || (target[index] = {});
      key = newKey;
    }
    target[key] = value;
  }
  return out;
}

function apiRequestRaw(route, options) {
  options = options || {};
  const authToken = cookies.get("authToken");
  return fetch(backendUrl + route, {
    credentials: "include",
    ...options,
  });
}

function apiRequest(route, options) {
  return apiRequestRaw(route, options).then((r) => {
    if (r.status === 401) {
      window.location.href = "/#/unauthorized";
      return undefined;
    }
    return r.json();
  });
}

function StageTagRaw({ stage, ...props }) {
  return (
    <Tag color={stageToColor[stage]} {...props}>
      {stage
        .split("-")
        .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
        .join(" ")}
    </Tag>
  );
}

function StageTag({ applicantId, stage, onNewStage }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <Popover
      content={
        <List
          size="small"
          dataSource={stages}
          onClick={(e) => e.stopPropagation()}
          renderItem={(item) => (
            <List.Item>
              <StageTagRaw
                stage={item}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setLoading(true);
                  apiRequest(`/applicants/${applicantId}/stage`, {
                    method: "PUT",
                    headers: {
                      Accept: "application/json",
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(item),
                  }).then((d) => {
                    setLoading(false);
                    setOpen(false);
                    onNewStage(d);
                  });
                }}
                style={{
                  opacity: loading ? 0.5 : 1.0,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              />
            </List.Item>
          )}
        />
      }
      visible={open}
      onVisibleChange={setOpen}
      title="Change Stage"
      trigger="click"
    >
      <StageTagRaw
        stage={stage}
        style={{ cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />
    </Popover>
  );
}

function Searcher({ setFilter, ...props }) {
  return (
    <Input.Search
      placeholder="Search"
      enterButton={true}
      onSearch={(query) => {
        setFilter(() => (data) => {
          const tester = new RegExp(query, "i");
          return data.map((x) =>
            Math.min(
              ...["name", "email", "stage", "emailText"].map((key, i) => {
                if (tester.test(x[key])) {
                  return i;
                }
                return Infinity;
              })
            )
          );
        });
      }}
      {...props}
    ></Input.Search>
  );
}

function MainPage() {
  const [data, setData] = useState(undefined);
  const [filter, setFilter] = useState(() => (x) => x.map(() => 1));
  const history = useHistory();
  const order = filter(data || []);

  const comparatorKeys = [
    (_, xi) => order[xi], // Search Rank
    (x) => stages.indexOf(x.stage), // Stage
    (x) => -(Date.parse(x.dateSubmitted) || 0), // Date submitted
  ];
  let sortedData = (data || [])
    .map((v, i) => [v, i])
    .filter(([_, i]) => isFinite(order[i]))
    .sort((xt, yt) => {
      for (
        let comparatorIndex = 0;
        comparatorIndex < comparatorKeys.length;
        ++comparatorIndex
      ) {
        const mapper = comparatorKeys[comparatorIndex];
        const vx = mapper(...xt);
        const vy = mapper(...yt);
        if (vx !== vy) {
          return vx < vy ? -1 : 1;
        }
      }
      return 0;
    })
    .map(([x, _]) => x);
  useEffect(() => {
    apiRequest("/applicants").then((d) => {
      if (d && d.length > 0) {
        setData(d.map((vs) => ({ ...vs, key: vs.id })));
      } else {
        message.error("Failed to get data from backend.");
        setData(null);
      }
    });
  }, []);

  const ApplicantRow = ({ index, moveRow, className, style, ...restProps }) => {
    return (
      <tr
        className={className}
        style={{ cursor: "pointer", ...style }}
        {...restProps}
        onClick={(e) => {
          if (data !== undefined) {
            history.push(`/applicant/${restProps["data-row-key"]}`);
          }
        }}
      />
    );
  };
  return (
    <>
      <h1 style={{ margin: 20, marginLeft: 0, marginTop: 20, marginBottom: 0 }}>
        Applicants
      </h1>
      <span style={{ marginLeft: 8 }}>
        <i>Parsed via email</i>
      </span>
      <div style={{ height: 20 }} />
      <Searcher setFilter={setFilter} className="forward" />
      <div style={{ height: 24 }} />
      <Table
        components={{ body: { row: ApplicantRow } }}
        dataSource={sortedData}
        loading={data === undefined}
        className="forward-table"
      >
        <Column title="Name" dataIndex="name" key="name" />
        <Column
          title="Email"
          dataIndex="email"
          key="email"
          render={(email) => (
            <a
              href={`mailto:${email}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {email}
            </a>
          )}
        />
        {/* <Column
          title="Resume"
          dataIndex="resumeUrl"
          key="resumeUrl"
          render={(resumeUrl) =>
            resumeUrl ? (
              <a
                href={backendUrl + resumeUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {resumeUrl.split("/").slice(-1)[0]}
                </span>
              </a>
            ) : (
              <></>
            )
          }
        /> */}
        <Column
          title="Intro"
          dataIndex="emailText"
          key="emailText"
          ellipsis={true}
        />
        <Column
          title="Date"
          dataIndex="dateSubmitted"
          key="dateSubmitted"
          render={(date) => <DateTag date={date} />}
        />
        <Column
          title="Rating"
          dataIndex="ratings"
          key="ratings"
          render={(ratings) => {
            let average = (array) =>
              array.reduce((a, b) => a + b) / array.length;
            return ratings.length > 0 ? <Rate disabled value={average(ratings.map((x) => x.attributes.overall))} /> : <></>;
          }}
        />
        <Column
          title="Stage"
          dataIndex="stage"
          key="stage"
          render={(stage, applicant) => (
            <StageTag
              applicantId={applicant.id}
              stage={stage}
              onNewStage={(stage) => {
                setData(
                  data.map((i) => ({
                    ...i,
                    stage: i.id === applicant.id ? stage : i.stage,
                  }))
                );
              }}
            />
          )}
        />
      </Table>
    </>
  );
}

function AddRatingCard({ applicantId, onFinished, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  return (
    <Form
      form={form}
      name="basic"
      onFinish={(values) => {
        cookies.set("reviewerName", values.rater, {
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
        setLoading(true);
        apiRequest(`/applicants/${applicantId}/ratings`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(unflattenObject(values)),
        }).then((d) => {
          message.success("Submitted rating.");
          onFinished(d);
        });
      }}
      onFinishFailed={({ errorFields }) => {
        const hasAttributeError = errorFields.some((x) =>
          x.name[0].startsWith("attributes:")
        );
        const hasReviewerError = errorFields.some((x) => x.name[0] == "rater");
        if (hasAttributeError) {
          message.error(`All ratings are required.`);
        }
        if (hasReviewerError) {
          message.error(`Reviewer name is required.`);
        }
      }}
    >
      <Card
        className="forward"
        type="inner"
        title={
          <Form.Item
            noStyle
            name="rater"
            rules={[{ required: true }]}
            initialValue={cookies.get("reviewerName")}
          >
            <Input placeholder="Reviewer Name" />
          </Form.Item>
        }
        actions={[
          <Form.Item noStyle>
            <Button type="primary" htmlType="submit" loading={loading}>
              Submit
            </Button>
          </Form.Item>,
          <Button
            onClick={() => {
              form.resetFields();
              onCancel();
            }}
          >
            Cancel
          </Button>,
        ]}
      >
        <table style={{ margin: "auto" }}>
          <tbody>
            {allAttributes.map((attrName) => {
              const label =
                attrName.charAt(0).toUpperCase() + attrName.slice(1);
              return (
                <tr style={{ textAlign: "right" }} key={attrName}>
                  <td>
                    <p
                      style={{
                        height: "38px",
                        lineHeight: "38px",
                        margin: 0,
                        marginRight: 10,
                      }}
                    >{`${label}: `}</p>
                  </td>
                  <td>
                    <Form.Item noStyle name={`attributes:${attrName}`}>
                      <Rate />
                    </Form.Item>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Form.Item noStyle name="notes">
          <Input.TextArea
            style={{ marginTop: 16 }}
            placeholder="Notes"
          ></Input.TextArea>
        </Form.Item>
      </Card>
    </Form>
  );
}

function DateTag({ date }) {
  if (!date) {
    return <></>;
  }
  date = new Date(date);
  return (
    <Tooltip
      title={date.toLocaleDateString() + " " + date.toLocaleTimeString()}
    >
      <Tag>{TimeDiff(date)}</Tag>
    </Tooltip>
  );
}

function AboutPage(props) {
  return (
    <>
      <div style={{ height: "2vh" }} />
      <Breadcrumb>
        <Breadcrumb.Item href="#/">Home</Breadcrumb.Item>
        <Breadcrumb.Item href={`#/about`}>About</Breadcrumb.Item>
      </Breadcrumb>
      <div style={{ height: "0.6em" }} />
      <Row gutter={20} align="middle">
        <h1>About</h1>

        <p>
          Trakario is an open source applicant tracking system. Basically, lets
          say you create a job posting asking candidates to email you their
          resumes. You get way too many and are trying to figure out how to not
          let even one email slip through the cracks, and you want a way to
          systematically organize them all and keep track of what stage they are
          in.
        </p>

        <figure>
          <img
            src="https://images.unsplash.com/reserve/LJIZlzHgQ7WPSh5KVTCB_Typewriter.jpg?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=2141&q=80"
            style={{ width: "100%" }}
          />
          <figcaption>
            <i>
              Feel like you're application process is outdated? Try Trakario.
            </i>
          </figcaption>
        </figure>

        <p>
          Introducing Trakario. It does exactly that. Nothing more, nothing
          less. Just forward your emails to a specific address it is listening
          to and voila, Trakario automatically enters the candidate into the
          database, ready for you to review.
        </p>
      </Row>
    </>
  );
}

function UnauthorizedPage({ setToken }) {
  const history = useHistory();
  useEffect(() => {
    apiRequestRaw("/test-auth").then((r) => {
      if (r.ok) {
        if (history.length > 0) {
          history.goBack();
        } else {
          history.push("/");
        }
      }
    });
  }, []);
  return (
    <>
      <div style={{ height: "2vh" }} />
      <Breadcrumb>
        <Breadcrumb.Item href="#/">Home</Breadcrumb.Item>
        <Breadcrumb.Item href={`#/about`}>Unauthorized</Breadcrumb.Item>
      </Breadcrumb>
      <div style={{ height: "10em" }} />
      <div style={{ textAlign: "center", maxWidth: 500, margin: "auto" }}>
        <h1>Unauthorized</h1>

        <p>
          You must click a link with an access token or provide a code to use
          Trakario
        </p>

        <Form
          onFinish={(values) => {
            setToken(values.code);
          }}
          requiredMark={false}
        >
          Enter Code:{" "}
          <Form.Item noStyle name="code" required={true}>
            <Input style={{ maxWidth: 200 }} />
          </Form.Item>
          <Button htmlType="submit">Submit</Button>
        </Form>
      </div>
    </>
  );
}

function RatingCard({
  applicantId,
  rating: { id, rater, attributes, notes },
  onDeleted,
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Card
      type="inner"
      className="forward"
      title={
        <div style={{ textAlign: "center" }}>
          <b>Rater:</b> {rater}
        </div>
      }
      actions={[
        <Button
          style={{ float: "right", marginRight: 10 }}
          onClick={() => {
            setLoading(true);
            apiRequest(`/applicants/${applicantId}/ratings/${id}`, {
              method: "DELETE",
            }).then(() => {
              message.info("Deleted rating.");
              onDeleted();
            });
          }}
        >
          <DeleteOutlined />
        </Button>,
      ]}
    >
      <table style={{ margin: "auto" }}>
        <tbody>
          {allAttributes.map((attrName) => {
            const label = attrName.charAt(0).toUpperCase() + attrName.slice(1);
            return (
              <tr style={{ textAlign: "right" }} key={attrName}>
                <td>
                  <p
                    style={{
                      height: "38px",
                      lineHeight: "38px",
                      margin: 0,
                      marginRight: 10,
                    }}
                  >{`${label}: `}</p>
                </td>
                <td>
                  <Rate disabled defaultValue={attributes[attrName] || 0} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {notes && notes.length !== 0 ? <div style={{ height: 14 }} /> : <></>}
      <div style={{ width: "100%", textAlign: "center" }}>
        <ReactMarkdown>{notes}</ReactMarkdown>
      </div>
    </Card>
  );
}

function ApplicantPage(props) {
  const applicantId = props.match.params.applicantId;
  const [applicantData, setApplicantData] = useState(undefined);
  const [addShown, setAddShown] = useState(false);
  useEffect(() => {
    if (applicantId !== undefined) {
      apiRequest(`/applicants/${applicantId}`).then((d) => {
        if (!d) {
          return;
        }
        setApplicantData(d);
        if (d.ratings.length === 0) {
          setAddShown(true);
        }
      });
    }
  }, [applicantId]);
  const d = applicantData;
  const ratings = (applicantData || {}).ratings || [];
  const [isEditingName, setIsEditingName] = useState(false);
  return (
    <>
      <div style={{ height: "2vh" }} />
      <Breadcrumb>
        <Breadcrumb.Item href="#/">Home</Breadcrumb.Item>
        <Breadcrumb.Item href={`#/applicant/${applicantId}`}>
          Applicant {applicantId}
        </Breadcrumb.Item>
      </Breadcrumb>
      <div style={{ height: "0.6em" }} />
      {applicantData === undefined ? (
        <Skeleton />
      ) : (
        <>
          <Row gutter={20} align="middle">
            <Col key="name">
              {isEditingName ? (
                <Form
                  onFinish={(values) =>
                    apiRequest(`/applicants/${applicantId}/name`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                      },
                      body: JSON.stringify(values.name),
                    }).then((v) => {
                      setApplicantData({ ...d, name: v });
                      setIsEditingName(false);
                    })
                  }
                >
                  <Form.Item noStyle name="name" initialValue={d.name}>
                    <Input placeholder="Applicant Name"></Input>
                  </Form.Item>
                </Form>
              ) : (
                <h1 onClick={() => setIsEditingName(true)}>{d.name}</h1>
              )}
            </Col>
            <Col key="time">
              <StageTag
                applicantId={d.id}
                stage={d.stage}
                onNewStage={(stage) =>
                  setApplicantData({ ...applicantData, stage })
                }
              />
              {d.githubUrl ? (
                <Tag
                  onClick={() => {
                    window.open(d.githubUrl, "_blank", "noreferrer,noopener");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  GitHub
                </Tag>
              ) : (
                <></>
              )}
              {d.resumeUrl ? (
                <Tag
                  onClick={() => {
                    window.open(d.resumeUrl, "_blank", "noreferrer,noopener");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  Resume
                </Tag>
              ) : (
                <></>
              )}
              <DateTag date={d.dateSubmitted} />
            </Col>
          </Row>
          <div style={{ height: "0.6em" }} />
          <ReactMarkdown>
            {(d.emailText || "").replace(
              /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*))/gi,
              "[$1]($1)"
            )}
          </ReactMarkdown>
          <div style={{ height: "10px" }} />
          <Card
            className="raised"
            title={<p style={{ fontSize: "1.6em", margin: 0 }}>Ratings</p>}
            bordered={false}
          >
            <Row gutter={20} align="top" style={{ minHeight: 307 }}>
              {ratings.map((rating) => (
                <Col xl={8} lg={10} md={12} sm={16} xs={24} key={rating.id}>
                  <RatingCard
                    applicantId={applicantId}
                    rating={rating}
                    onDeleted={() => {
                      setApplicantData({
                        ...applicantData,
                        ratings: applicantData.ratings.filter(
                          (x) => x.id != rating.id
                        ),
                      });
                    }}
                  />
                </Col>
              ))}
              {!addShown ? (
                <Button onClick={() => setAddShown(true)}>+</Button>
              ) : (
                <Col xl={8} lg={10} md={12} sm={16} xs={24}>
                  <AddRatingCard
                    applicantId={applicantId}
                    onFinished={(newRating) => {
                      setApplicantData({
                        ...applicantData,
                        ratings: [...applicantData.ratings, newRating],
                      });
                      setAddShown(false);
                    }}
                    onCancel={() => setAddShown(false)}
                  />
                </Col>
              )}
            </Row>
          </Card>
          {d.resumeUrl ? (
            <>
              <div style={{ height: "4vh" }} />
              <Card className="raised" bordered={false}>
                <iframe
                  src={backendUrl + d.resumeUrl}
                  title={`Resume for ${d.name}`}
                  style={{ width: "100%", height: "100vh" }}
                ></iframe>
              </Card>
              <div style={{ height: "2vh" }} />
            </>
          ) : (
            <></>
          )}
        </>
      )}
    </>
  );
}

function TrakarioHeader() {
  const location = useLocation();
  return (
    <Header>
      <Menu mode="horizontal" theme="dark" selectedKeys={[location.pathname]}>
        <Menu.Item style={{ pointerEvents: "none", paddingRight: 0 }}>
          <img
            src="/logo.png"
            style={{
              display: "inline-block",
              verticalAlign: "top",
              height: 48,
              marginTop: (64 - 48) / 2,
              marginBottom: (64 - 48) / 2,
              marginRight: 12,
            }}
          />
          <Link to="/">
            <h2
              style={{
                color: "white",
                margin: "0 0.0em",
                padding: "0.0em 0",
                display: "inline-block",
                verticalAlign: "top",
              }}
            >
              Trakario
            </h2>
          </Link>
          <div
            style={{
              borderLeft: "1px solid #ffffff44",
              display: "inline-block",
              verticalAlign: "top",
              height: 48,
              marginTop: 8,
              marginRight: 0,
              marginLeft: 16,
            }}
          ></div>
        </Menu.Item>
        {[
          ["Applicants", "/"],
          ["About", "/about"],
          ["GitHub", "https://github.com/trakario/trakario-frontend"],
          ["Contact us", "mailto:matthew331199@gmail.com"],
        ].map(([label, path]) => {
          return (
            <Menu.Item key={path}>
              {path.charAt(0) == "/" ? (
                <Link to={path}>{label}</Link>
              ) : (
                <a
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => message.info("Opened link.")}
                  href={path}
                >
                  {label}
                </a>
              )}
            </Menu.Item>
          );
        })}
      </Menu>
    </Header>
  );
}

function TrakarioFooter() {
  return (
    <Footer style={{ textAlign: "center" }}>
      Trakario Developers ©2020 Created by Trakario Developers
    </Footer>
  );
}

function App() {
  const history = useHistory();
  const [token, setToken] = useQueryParam("authToken", StringParam);
  if (token) {
    apiRequestRaw("/authorize?code=" + token).then((r) => {
      if (r.ok) {
        setToken(undefined, "replace");
        history.push("/");
      } else {
        message.error("Invalid code.");
        history.push("/unauthorized");
      }
    });
  }
  return (
    <>
      <Layout>
        <TrakarioHeader />
        <Content>
          <div style={{ minHeight: "calc(100vh - 64px - 70px)" }}>
            <Row justify="center">
              <Col xs={24} sm={22} md={22} lg={20} xl={18} xxl={14}>
                <Route exact path="/" component={MainPage} />
                <Route
                  exact
                  path="/applicant/:applicantId"
                  component={ApplicantPage}
                />
                <Route exact path="/about" component={AboutPage} />
                <Route
                  exact
                  path="/unauthorized"
                  render={() => <UnauthorizedPage setToken={setToken} />}
                />
              </Col>
            </Row>
          </div>
        </Content>
        <TrakarioFooter />
      </Layout>
    </>
  );
}
export default App;
